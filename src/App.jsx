
import { useState } from "react";
import { TiUserAdd, TiContacts } from "react-icons/ti";
import { MdPages } from "react-icons/md";
import { FaBuilding, FaList, FaStar } from "react-icons/fa";
import LeadList from "./Pages/LeadList";
import AccountList from "./Pages/AccountList";
import MultiPageScraper from "./Pages/MultiPageScraper";

function App() {
  const [pageView, setPageView] = useState("Accounts");

  return (
    <div className="w-[420px] min-h-[650px] bg-gradient-to-br from-gray-900 via-slate-900 to-black backdrop-blur-xl shadow-2xl rounded-lg overflow-auto border border-white/10">
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-purple-600/80 via-blue-600/80 to-indigo-700/80 backdrop-blur-xl p-3 text-white border-b border-white/10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
            <FaStar className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Scrapo
          </h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-black/40 backdrop-blur-xl shadow-lg border-b border-white/10">
        <button
          onClick={() => setPageView("Accounts")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
            pageView === "Accounts"
              ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white shadow-lg border-t-2 border-blue-400/50"
              : "text-gray-300 hover:bg-white/10 hover:text-blue-300 border-t-2 border-transparent"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FaBuilding className="text-sm" />
            <span>Accounts</span>
          </div>
        </button>
        <button
          onClick={() => setPageView("Lead List")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
            pageView === "Lead List"
              ? "bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white shadow-lg border-t-2 border-purple-400/50"
              : "text-gray-300 hover:bg-white/10 hover:text-purple-300 border-t-2 border-transparent"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FaList className="text-sm" />
            <span>Lead List</span>
          </div>
        </button>
        <button
          onClick={() => setPageView("Multi-Page")}
          className={`flex-1 py-3 px-2 text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
            pageView === "Multi-Page"
              ? "bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white shadow-lg border-t-2 border-emerald-400/50"
              : "text-gray-300 hover:bg-white/10 hover:text-emerald-300 border-t-2 border-transparent"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <MdPages className="text-sm" />
            <span>Multi-Page</span>
          </div>
        </button>
      </div>

      {/* Page Content */}
      <div className="overflow-auto bg-gradient-to-b from-transparent to-black/20">
        {pageView === "Accounts" && <AccountList />}
        {pageView === "Lead List" && <LeadList />}
        {pageView === "Multi-Page" && <MultiPageScraper />}
      </div>
    </div>
  );
}

export default App;
