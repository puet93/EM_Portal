import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { DocumentSyncIcon } from '~/components/Icons';

export default function FileDropInput({
	id,
	name,
	handleChange,
	accept,
}: {
	id: string;
	name: string;
	handleChange: (event: SyntheticEvent) => void;
	accept?: string;
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
				accept={accept}
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
