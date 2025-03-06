import { useContext } from "react";
import Editor, { EditorFile } from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "@/ReactPlayground/PlaygroundContext";
export default function CodeEditor() {
	const { files, setFiles, selectedFileName, setSelectedFileName } =
		useContext(PlaygroundContext);
	const file = files[selectedFileName];

	function onEditerChange() {
		console.log(...arguments);
	}
	return (
		<div className=" flex flex-col h-full">
			<FileNameList />
			<Editor
				file={file}
				onChange={onEditerChange}
			/>
		</div>
	);
}
