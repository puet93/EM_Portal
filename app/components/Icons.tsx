export function EditIcon() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M21 11V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V5C3 3.895 3.895 3 5 3H13"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M20.707 6.12125L9.828 17.0002H7V14.1722L17.879 3.29325C18.27 2.90225 18.903 2.90225 19.293 3.29325L20.707 4.70725C21.098 5.09825 21.098 5.73125 20.707 6.12125Z"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M16.09 5.08984L18.91 7.90984"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function ImageIcon() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="5"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M3.0835 16.9148L8.28993 11.7083C9.23438 10.7639 10.7656 10.7639 11.7101 11.7083L19.5364 19.5347"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15.3226 8.32383L15.3231 8.32339C15.4206 8.22614 15.5784 8.22629 15.6757 8.32372C15.773 8.42116 15.773 8.57901 15.6756 8.67639C15.5783 8.77376 15.4204 8.77381 15.323 8.6765C15.2255 8.57919 15.2254 8.42133 15.3226 8.32383"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function SaveIcon() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M16.164 3H5.007C3.897 3 2.999 3.904 3.007 5.015L3.111 19.015C3.119 20.114 4.012 21 5.111 21H18.992C20.097 21 20.992 20.105 20.992 19V7.828C20.992 7.298 20.781 6.789 20.406 6.414L17.578 3.586C17.203 3.211 16.695 3 16.164 3Z"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15.993 3V6.909C15.993 7.461 15.545 7.909 14.993 7.909H8.993C8.441 7.909 7.993 7.461 7.993 6.909V3"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M7 21V13.286C7 12.576 7.576 12 8.286 12H15.715C16.424 12 17 12.576 17 13.286V21"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function SearchIcon({
	className,
	id,
}: {
	className: string;
	id: string;
}) {
	return (
		<svg
			className={className}
			id={id}
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
		>
			<path
				d="M15.7138 6.8382C18.1647 9.28913 18.1647 13.2629 15.7138 15.7138C13.2629 18.1647 9.28913 18.1647 6.8382 15.7138C4.38727 13.2629 4.38727 9.28913 6.8382 6.8382C9.28913 4.38727 13.2629 4.38727 15.7138 6.8382"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M19 19L15.71 15.71"
				stroke=""
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function TrashIcon() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
			<path
				d="M5 7H19"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M18 7V18C18 19.105 17.105 20 16 20H8C6.895 20 6 19.105 6 18V7"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15 3.75H9"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M10 11V16"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M14 11V16"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
