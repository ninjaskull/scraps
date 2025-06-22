/* eslint-disable no-undef */
import { useState } from "react";

import Papa from "papaparse";
const LeadList = () => {
  const [csvData, setCsvData] = useState("");
  const [tableSheetCount, setTableSheetCount] = useState(0);

  const fetchLeadData = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          // Human-like auto-scroll function to load all content on current page
          const scrollToEndAndBackToTop = async () => {
            const delay = ms => new Promise(res => setTimeout(res, ms));

            // Step 1: Find scrollable container
            const container = Array.from(document.querySelectorAll('div'))
              .find(el => el.scrollHeight > el.clientHeight && el.clientHeight > 300)
              || document.scrollingElement || window;

            if (!container) {
              console.error('❌ No scrollable container found.');
              return;
            }

            console.log('🌀 Starting human‑like scroll to bottom...');

            // Step 2: Scroll down in specific percentage steps: 0%, 5%, 33%, 66%, 100%
            const maxScroll = container === window ? document.body.scrollHeight : container.scrollHeight;
            const scrollPercentages = [0, 0.05, 0.33, 0.66, 1.0]; // 0%, 5%, 33%, 66%, 100%
            
            for (let i = 0; i < scrollPercentages.length; i++) {
              const targetY = Math.min(maxScroll, maxScroll * scrollPercentages[i]);
              if (container === window) {
                window.scrollTo({ top: targetY, behavior: 'smooth' });
              } else {
                container.scrollTo({ top: targetY, behavior: 'smooth' });
              }
              console.log(`→ Scrolled to ${(scrollPercentages[i] * 100).toFixed(0)}%`);
              await delay(800 + Math.random() * 400);
            }

            // Step 3: Final pause
            await delay(1500);
            console.log('✅ Reached bottom of current page.');

            // Step 4: Scroll back to top smoothly
            console.log('🔼 Scrolling back to top...');
            if (container === window) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
            await delay(1000); // Optional pause after reaching top
            console.log('🏁 Returned to top.');
          };

          // Perform auto-scroll to end and back to top before scraping
          await scrollToEndAndBackToTop();

          const tableElement = document.querySelector("table");
          if (tableElement) {
            return {
              tableHTML: tableElement.outerHTML,
            };
          }
          return { tableHTML: "No table found" };
        },
      });

      const data = response[0].result;

      if (data.tableHTML !== "No table found") {
        convertTableToCsv(data.tableHTML);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const convertTableToCsv = async (tableHTML) => {
    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = tableHTML;

      const table = tempDiv.querySelector("table");
      const headers = Array.from(table.querySelectorAll("thead th"));
      const rows = Array.from(table.querySelectorAll("tbody tr"));

      const headerArray = headers.map((header) => header.textContent.trim());

      // Insert "Designation" header after "Name"
      headerArray.splice(1, 0, "Profile URL");
      headerArray.splice(2, 0, "Designation");

      const outreachActivityIndex = headerArray.indexOf("Outreach activity");

      // Extract rows
      const dataArray = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));

        const nameCell = cells[0]?.querySelector("a span");
        const name = nameCell ? nameCell.textContent.trim() : "Name not found";

        const profileLinkElement = cells[0]?.querySelector("a");
        const profileLink = profileLinkElement
          ? profileLinkElement.getAttribute("href")
          : "Link not found";

        const designationCell = cells[0]?.querySelector(
          "div[data-anonymize='job-title']"
        );
        const designation = designationCell
          ? designationCell.textContent.trim()
          : "Designation not found";

        const outreachActivityCell = cells[
          outreachActivityIndex - 2
        ]?.querySelector("button span.lists-table__outreach-activity-text");
        const outreachActivity = outreachActivityCell
          ? outreachActivityCell.textContent.trim()
          : "Outreach Activity Not Found";

        const rowData = cells.map((cell, index) => {
          // Replace dynamic columns with extracted data
          if (index === 0) return name;
          if (index === outreachActivityIndex - 2) return outreachActivity;
          return cell.textContent.trim();
        });

        rowData.splice(1, 0, `https://www.linkedin.com${profileLink}`);
        rowData.splice(2, 0, designation);

        return rowData;
      });

      const previousData = await new Promise((resolve) => {
        chrome.storage.local.get(["scrapedData"], (result) => {
          resolve(result.scrapedData || []);
        });
      });

      const isHeaderIncluded =
        previousData.length > 0 &&
        previousData[0].every((header, index) => header === headerArray[index]);

      const combinedData = isHeaderIncluded
        ? [...previousData, ...dataArray]
        : [headerArray, ...previousData, ...dataArray];

      chrome.storage.local.set({ scrapedData: combinedData });

      setTableSheetCount(combinedData.length - 1);
    } catch (error) {
      console.error("Error converting table to CSV", error);
    }
  };

  const unperseData = async () => {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(["scrapedData"], (result) => {
        resolve(result.scrapedData || []);
      });
    });

    if (data.length > 0) {
      const csv = Papa.unparse(data);
      setCsvData(csv);
    } else {
      console.error("No data available to convert to CSV");
    }
  };

  const downloadCsv = () => {
    if (!csvData) {
      console.error("No CSV data available for download");
      return;
    }

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linkedin_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    clearData();
  };

  const clearData = () => {
    chrome.storage.local.remove("scrapedData", () => {
      setCsvData("");
      setTableSheetCount(0);
    });
  };

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800">Lead List Scraper</h1>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            Scrape data from{" "}
            <a
              href="https://www.linkedin.com/sales/lists/people"
              target="_blank"
              className="text-purple-600 hover:text-purple-700 font-semibold underline decoration-2 underline-offset-2"
            >
              LinkedIn Lead Lists
            </a>
            <br />
            <span className="text-gray-500">Select your lead list first</span>
          </p>
        </div>
      </div>

      

      {/* Action Section */}
      <div className="space-y-4">
        <button
          onClick={fetchLeadData}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Scrape Lead Data
        </button>

        {tableSheetCount > 0 && (
          <button
            onClick={unperseData}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Convert to CSV
          </button>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{tableSheetCount}</p>
            <p className="text-sm text-gray-500 font-medium">Total Records Scraped</p>
          </div>
        </div>

        {/* Download Actions */}
        {csvData && (
          <div className="space-y-3">
            <button
              onClick={downloadCsv}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Download CSV File
            </button>
            <button
              onClick={clearData}
              className="w-full py-2 px-6 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Data
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">Developed by AMIT for personal use • v1.1</p>
      </div>
    </div>
  );
};

export default LeadList;