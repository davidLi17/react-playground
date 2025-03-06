import MonacoEditor, { EditorProps, OnMount } from "@monaco-editor/react";
import { message } from "antd";
import { createATA } from "./ata";
import { useTheme } from "../../../ThemeContext";

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
	const { theme } = useTheme();

	const handleEditorMound: OnMount = (editor, monaco) => {
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			jsx: monaco.languages.typescript.JsxEmit.Preserve,
			esModuleInterop: true,
		});

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
			console.log("ctrl + enter");
		});

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
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
			theme={theme === "dark" ? "vs-dark" : "light"}
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
