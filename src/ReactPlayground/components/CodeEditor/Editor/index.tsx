import MonacoEditor, { EditorProps, OnMount } from "@monaco-editor/react";
// 声明 antd 模块以解决类型问题
import { message } from "antd";
import { createATA } from "./ata";
//name:App.tsx,value:write code ,language:typeScript
export interface EditorFile {
	name: string;
	value: string;
	language: string;
}
interface Props {
	file: EditorFile;
	onChange: EditorProps["onChange"];
	options?: EditorProps["options"];
}
export default function Editor(props: Props) {
	const { file, onChange, options } = props;
	const code = `export default function App() {
    return <div>xxx</div>
}
    `;
	const handleEditorMound: OnMount = (editor, monaco) => {
		// onMount 也就是编辑器加载完的回调里，设置 ts 的默认 compilerOptions。
		//这里设置 jsx 为 preserve，也就是输入 <div> 输出 <div>，保留原样。
		//如果设置为 react 会输出 React.createElement("div")。
		//设置 esModuleInterop 会在编译的时候自动加上 default 属性。
		// from import * as fs from 'fs';
		//TO import fs from 'fs';
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			jsx: monaco.languages.typescript.JsxEmit.Preserve,
			esModuleInterop: true,
		});
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
			console.log("ctrl + enter");
		});
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
			// let actions = editor.getSupportedActions().map((a) => a.id);
			editor.getAction("editor.action.formatDocument")?.run();
			message.success("代码保存成功", 0.5);
		});
		const ata = createATA((code, path) => {
			monaco.languages.typescript.typescriptDefaults.addExtraLib(
				code,
				`file://${path}`
			);
		});
		editor.onDidChangeModelContent(() => {
			ata(editor.getValue());
		});
		ata(editor.getValue());
	};
	return (
		<MonacoEditor
			height="100%"
			path={file.name}
			language={file.language || "typescript"}
			onMount={handleEditorMound}
			onChange={onChange}
			// theme="vs-dark"
			value={file.value}
			options={{
				fontSize: 16,
				scrollBeyondLastLine: false,
				minimap: {
					enabled: false,
				},
				scrollbar: {
					verticalScrollbarSize: 6,
					horizontalScrollbarSize: 6,
				},
				...options,
			}}
		/>
	);
}
