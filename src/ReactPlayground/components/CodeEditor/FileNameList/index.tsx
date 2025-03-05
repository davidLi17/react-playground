import { useContext, useState, useEffect } from "react";
import { PlaygroundContext } from "@/ReactPlayground/PlaygroundContext";
export default function FileNameList() {
	const {
		files,
		selectedFileName,
		setSelectedFileName,
		setFiles,
		addFile,
		removeFile,
		updateFileName,
	} = useContext(PlaygroundContext);
	const [tabs, setTabs] = useState([""]);

	useEffect(() => {
		setTabs(Object.keys(files));
	}, [files]);

	return (
		<div>
			{tabs.map((fileName) => (
				<div
					key={fileName}
					className={`tab ${
						selectedFileName === fileName
							? " border-b border-solid border-blue-500"
							: ""
					}`}
					onClick={() => setSelectedFileName(fileName)}>
					{fileName}
					<button onClick={() => removeFile(fileName)}>X</button>
				</div>
			))}
		</div>
	);
}
