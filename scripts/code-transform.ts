import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import {
	type ArrowFunctionExpression,
	// biome-ignore lint/suspicious/noShadowRestrictedNames: false ignore
	type Function,
	type ParamPattern,
	parseSync,
	type Statement,
} from "oxc-parser";
import { walk } from "oxc-walker";

function sourceTextFromNode(
	sourceText: string,
	node: { start: number; end: number },
): string {
	const start = node.start;
	const end = node.end;
	return sourceText.slice(start, end);
}

function unwrapParamPattern(param: ParamPattern): ParamPattern {
	if (param.type === "TSParameterProperty") {
		return param.parameter;
	}
	if (param.type === "RestElement") {
		return param.argument;
	}
	return param;
}

function getParamSourceText(
	sourceText: string,
	param: ParamPattern | undefined,
): string | undefined {
	if (!param) {
		return undefined;
	}
	return sourceTextFromNode(sourceText, param);
}

function getParamIdentifierName(
	param: ParamPattern | undefined,
): string | undefined {
	if (!param) {
		return undefined;
	}
	const base = unwrapParamPattern(param);
	return base.type === "Identifier" ? base.name : undefined;
}

function getFunctionBodyText(
	sourceText: string,
	body: ArrowFunctionExpression["body"] | Function["body"],
): string {
	if (!body) {
		return "";
	}
	if (body.type === "BlockStatement") {
		return body.body.map((s) => sourceTextFromNode(sourceText, s)).join("\n");
	}
	return `${sourceTextFromNode(sourceText, body)};`;
}

function applyEdits(
	sourceText: string,
	edits: Array<{ start: number; end: number; content: string }>,
): string {
	const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
	let result = sourceText;
	let lastStart = Number.POSITIVE_INFINITY;
	for (const edit of sorted) {
		assert(
			edit.start <= edit.end,
			`Invalid edit range: ${edit.start}-${edit.end}`,
		);
		assert(
			edit.end <= lastStart,
			"Overlapping edits detected. This transformer expects non-overlapping edits.",
		);
		result =
			result.slice(0, edit.start) + edit.content + result.slice(edit.end);
		lastStart = edit.start;
	}
	return result;
}

export async function rewriteObservableSubscribeTofirstValueFrom(
	filename: string,
	content?: string,
) {
	const code = content ?? (await fsp.readFile(filename, "utf-8"));
	const parsedResult = parseSync("index.ts", code);
	const edits: Array<{ start: number; end: number; content: string }> = [];
	walk(parsedResult.program, {
		leave(node, _, _context) {
			const transformExprs = <T extends Statement[]>(children: T): T => {
				const newChildren: T = [] as any as T;
				for (const child of children) {
					if (
						child.type === "ExpressionStatement" &&
						child.expression.type === "CallExpression" &&
						child.expression.callee.type === "MemberExpression" &&
						child.expression.callee.computed === false &&
						child.expression.callee.property.type === "Identifier" &&
						child.expression.callee.property.name === "subscribe"
					) {
						let next: ArrowFunctionExpression | Function | undefined;
						let error: ArrowFunctionExpression | Function | undefined;
						let complete: ArrowFunctionExpression | Function | undefined;

						if (child.expression.arguments[0]?.type === "ObjectExpression") {
							const obj = child.expression.arguments[0];
							for (const prop of obj.properties) {
								if (
									prop.type === "Property" &&
									prop.key.type === "Identifier" &&
									(prop.value.type === "FunctionExpression" ||
										prop.value.type === "ArrowFunctionExpression")
								) {
									if (prop.key.name === "next") {
										next = prop.value;
									} else if (prop.key.name === "error") {
										error = prop.value;
									} else if (prop.key.name === "complete") {
										complete = prop.value;
									}
								}
							}
						} else if (
							child.expression.arguments.find(
								(arg) =>
									arg.type === "FunctionExpression" ||
									arg.type === "ArrowFunctionExpression",
							)
						) {
							const args: Array<
								Function | ArrowFunctionExpression | undefined
							> = child.expression.arguments.map((arg) =>
								arg.type === "FunctionExpression" ||
								arg.type === "ArrowFunctionExpression"
									? arg
									: undefined,
							);
							next = args[0];
							error = args[1];
							complete = args[2];
						}
						let newContent = `await firstValueFrom(${sourceTextFromNode(code, child.expression.callee.object)});`;

						if (next) {
							const nextParam = getParamSourceText(code, next.params[0]);

							if (nextParam) {
								newContent = `const ${nextParam} = ${newContent}`;
							}
							newContent += getFunctionBodyText(code, next.body);
						}

						if (error || complete) {
							const errorParam =
								getParamSourceText(code, error?.params[0]) ?? "err";
							const errorParamName =
								getParamIdentifierName(error?.params[0]) ?? "err";

							let errorBody = "";
							if (error) {
								errorBody += getFunctionBodyText(code, error.body);
							}
							if (complete) {
								const completBody = `if (${errorParamName} instanceof EmptyError) { ${getFunctionBodyText(code, complete.body)} }`;
								if (errorBody) {
									errorBody = `${completBody} else { ${errorBody} }`;
								} else {
									errorBody = completBody;
								}
							}

							newContent = `try { ${newContent} } catch (${errorParam}) { ${errorBody} }`;
						}

						const newNodes = parseSync("index.ts", newContent).program.body;

						edits.push({
							start: child.start,
							end: child.end,
							content: newContent,
						});

						newChildren.push(...newNodes);
					} else {
						newChildren.push(child as any);
					}
				}
				return newChildren;
			};
			if ("body" in node && Array.isArray(node.body) && node.body.length > 0) {
				const children = node.body;
				node.body = transformExprs(children as any)!;
			} else if (
				"body" in node &&
				node.body &&
				"type" in node.body &&
				node.body.type === "BlockStatement"
			) {
				const children = node.body.body;
				node.body.body = transformExprs(children)!;
			}
		},
	});

	const result = applyEdits(code, edits);

	return result;
}

export async function rewriteAllObservableSubscribeTofirstValueFrom(
	pattern: string | string[],
) {
	const files = fsp.glob(pattern);
	for await (const file of files) {
		const result = await rewriteObservableSubscribeTofirstValueFrom(file);

		await fsp.writeFile(file, result, "utf-8");
	}
}
