import type { SyntheticEvent } from 'react';
import { useState } from 'react';

import { DocumentSyncIcon } from '~/components/Icons';

export default function FileDropInput({
	id,
	name,
	handleChange,
}: {
	id: string;
	name: string;
	handleChange: (event: SyntheticEvent) => void;
}) {
	const [isDragging, setIsDragging] = useState(false);

	return (
		<div className="dropzone">
			<DocumentSyncIcon />
			<label className="caption" htmlFor={id}>
				Drag-and-drop file here
			</label>
			<input
				type="file"
				id={id}
				name={name}
				className={
					isDragging
						? 'upload-file-input active'
						: 'upload-file-input'
				}
				onChange={handleChange}
				onDragOver={() => {
					setIsDragging(true);
				}}
				onDrop={() => {
					setIsDragging(false);
				}}
				onDragLeave={() => {
					setIsDragging(false);
				}}
			/>
		</div>
	);
}
