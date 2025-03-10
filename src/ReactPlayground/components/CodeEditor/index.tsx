import { useContext, useCallback } from "react";
import Editor, { EditorFile } from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "@/ReactPlayground/PlaygroundContext";
import { debounce } from "lodash";
import { editor } from "monaco-editor";

export default function CodeEditor() {
	const { files, setFiles, selectedFileName, setSelectedFileName } =
		useContext(PlaygroundContext);
	const file = files[selectedFileName];

	const onEditerChange = useCallback(
		debounce(
			(value: string | undefined, event: editor.IModelContentChangedEvent) => {
				// 如果 value 是 undefined，则使用空字符串或当前文件的值
				const newValue = value ?? file.value;
				setFiles({
					...files,
					[selectedFileName]: {
						...file,
						value: newValue,
					},
				});
				console.log("onEditerChange", value, event);
			},
			500
		),
		[files, selectedFileName, file]
	);

	return (
		<div className="flex flex-col h-full">
			<FileNameList />
			<Editor
				file={file}
				onChange={onEditerChange}
			/>
		</div>
	);
}
