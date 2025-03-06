import classnames from "classnames";
import React, { useContext, useState, useEffect } from "react";
import { PlaygroundContext } from "@/ReactPlayground/PlaygroundContext";
import styles from "./index.module.scss";
export interface FileNameItemProps {
	value: string;
	actived: boolean;
	onClick: () => void;
}
export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
	const { value, actived = false, onClick } = props;
	const [name, setName] = useState(value);
	return <div className={classnames()}></div>;
};

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
		<div className="flex h-12 gap-2 border-b border-gray-200 px-2">
			{tabs.map((fileName) => (
				<div
					key={fileName}
					className={`group flex flex-1 justify-center items-center gap-2 rounded-t-lg first:ml-4 px-4 py-2 hover:bg-gray-100 cursor-pointer ${
						selectedFileName === fileName
							? " text-blue-500 border-b-2 border-blue-500"
							: "text-gray-600"
					}`}
					onClick={() => setSelectedFileName(fileName)}>
					<span className=" text-lg">{fileName}</span>
					<button
						onClick={(e) => {
							e.stopPropagation();
							removeFile(fileName);
						}}
						className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 text-lg">
						×
					</button>
				</div>
			))}
		</div>
	);
}
