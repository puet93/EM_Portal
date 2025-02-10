import { Link } from '@remix-run/react';

export default function Pagination({ currentPage, totalPages, pages }) {
    return (
        <nav area-label="pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm dark:bg-zinc-950">
            {/* Previous Button */}
            {currentPage > 1 ? (
                <Link
                    to="/"
                    // to={generateSearchParams(offset - pageSize)}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:hover:bg-white/10 dark:text-white dark:ring-zinc-700`}
                >
                    <span className="sr-only">Previous</span>
                    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                        <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"></path>
                    </svg>
                </Link>
            ) : (
                <button 
                    disabled
                    aria-disabled="true"
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset focus:z-20 focus:outline-offset-0 dark:text-zinc-700 dark:ring-zinc-700"
                >
                    <span className="sr-only">Previous</span>
                    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                        <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"></path>
                    </svg>
                </button>
            )}

            {/* Page Numbers */}
            {pages.map((page, index) =>
                page === "..." ? (
                    <span 
                        key={`ellipsis-${index}`} 
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0 dark:ring-zinc-700"
                    >
                        ...
                    </span>
                ) : (
                    <Link
                        key={page}
                        to="/" // Placeholder
                        // to={generateSearchParams((page - 1) * pageSize)} // New
                        // to={`?offset=${(page - 1) * pageSize}&pageSize=${pageSize}`} // Old
                        className={`relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 md:inline-flex dark:ring-zinc-700 ${
                            page === currentPage
                                ? "bg-sky-600 text-white"
                                : "text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/10"
                        }`}
                        aria-current={page === currentPage ? "page" : undefined}
                    >
                        {page}
                    </Link>
                )
            )}

            {/* Next Button */}
            {currentPage < totalPages ? (
                <Link
                    to="/"
                    // to={generateSearchParams(offset + pageSize)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:hover:bg-white/10 dark:text-white dark:ring-zinc-700"
                >
                    <span className="sr-only">Next</span>
                    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"></path>
                    </svg>
                </Link>
            ) : (
                <button 
                    disabled
                    aria-disabled="true"
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset focus:z-20 focus:outline-offset-0 dark:text-zinc-700 dark:ring-zinc-700"
                >
                    <span className="sr-only">Next</span>
                    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-slot="icon">
                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"></path>
                    </svg>
                </button>
            )}
        </nav>
    )
}