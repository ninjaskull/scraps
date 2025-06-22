import { TiUserAdd, TiContacts } from "react-icons/ti";
import { MdPages } from "react-icons/md";
import { useState } from "react";
import LeadList from "./Pages/LeadList";
import AccountList from "./Pages/AccountList";
import MultiPageScraper from "./Pages/MultiPageScraper";
import { FaBuilding, FaList } from "react-icons/fa"; // Import icons

function App() {
  const [pageView, setPageView] = useState("Accounts");

  return (
    <div className="w-[420px] min-h-[650px] bg-gradient-to-br from-gray-50 to-gray-100 shadow-2xl rounded-lg overflow-auto">
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold">LinkedIn Scraper</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white shadow-lg border-b">
        <button
          onClick={() => setPageView("Accounts")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-200 ${
            pageView === "Accounts"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FaBuilding className="text-sm" />
            <span>Accounts</span>
          </div>
        </button>
        <button
          onClick={() => setPageView("Lead List")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-200 ${
            pageView === "Lead List"
              ? "bg-purple-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50 hover:text-purple-600"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FaList className="text-sm" />
            <span>Lead List</span>
          </div>
        </button>
        <button
          onClick={() => setPageView("Multi-Page")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-200 ${
            pageView === "Multi-Page"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <MdPages className="text-sm" />
            <span>Multi-Page</span>
          </div>
        </button>
      </div>

      {/* Page Content */}
      <div className="overflow-auto">
        {pageView === "Accounts" && <AccountList />}
        {pageView === "Lead List" && <LeadList />}
        {pageView === "Multi-Page" && <MultiPageScraper />}
      </div>
    </div>
  );
}

export default App;