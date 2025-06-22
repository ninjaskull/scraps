/* eslint-disable no-undef */
import { useState } from "react";

import Papa from "papaparse";

const AccountList = () => {
  const [csvData, setCsvData] = useState("");
  const [tableSheetCount, setTableSheetCount] = useState(0);

  const fetchListData = async () => {
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

          // Select all list items
          const listItems = document.querySelectorAll(
            ".artdeco-list .artdeco-list__item"
          );
          const extractedData = Array.from(listItems).map((item) => {
            // Helper function to add only valid fields
            const addIfExists = (key, value) =>
              value ? { [key]: value.trim() } : {};

            // Extract data from the list item
            const nameElement = item.querySelector(
              ".artdeco-entity-lockup__title a"
            );
            const name = nameElement ? nameElement.textContent.trim() : null;

            const profileLink = nameElement
              ? `https://www.linkedin.com${nameElement.getAttribute("href")}`
              : null;

            const industryElement = item.querySelector(
              ".artdeco-entity-lockup__subtitle span[data-anonymize='industry']"
            );
            const industry = industryElement
              ? industryElement.textContent.trim()
              : null;

            const employeesElement = item.querySelector(
              "a.li-i18n-linkto._view-all-employees_1derdc"
            );
            const employees = employeesElement
              ? employeesElement.textContent.trim()
              : null;

            const aboutElement = item.querySelector(
              "dd.t-12.t-black--light.mb3 div span:nth-child(2)"
            );
            const about = aboutElement
              ? aboutElement.textContent.trim().replace("…see more", "").trim()
              : null;

            const designationElement = item.querySelector(
              ".artdeco-entity-lockup__subtitle span[data-anonymize='title']"
            );
            const designation = designationElement
              ? designationElement.textContent.trim()
              : null;

            const organizationElement = item.querySelector(
              ".artdeco-entity-lockup__subtitle a[data-anonymize='company-name']"
            );
            const organization = organizationElement
              ? organizationElement.textContent.trim()
              : null;

            const organizationUrl = organizationElement
              ? `https://www.linkedin.com${organizationElement.getAttribute(
                  "href"
                )}`
              : null;

            const locationElement = item.querySelector(
              ".artdeco-entity-lockup__caption span[data-anonymize='location']"
            );
            const location = locationElement
              ? locationElement.textContent.trim()
              : null;

            return {
              ...addIfExists("Name", name),
              ...addIfExists("ProfileURL", profileLink),
              ...addIfExists("Industry", industry),
              ...addIfExists("Employees", employees),
              ...addIfExists("About", about),
              ...addIfExists("Designation", designation),
              ...addIfExists("Organization", organization),
              ...addIfExists("OrganizationURL", organizationUrl),
              ...addIfExists("Location", location),
            };
          });

          return extractedData;
        },
      });

      const newData = response[0].result;
      chrome.storage.local.get("scrapedListData", (result) => {
        const existingData = result.scrapedListData || [];
        const combinedData = [...existingData, ...newData]; // Combine old and new data

        // Save the combined data back to storage
        chrome.storage.local.set({ scrapedListData: combinedData }, () => {
          const csv = (() => {
            // Extract all the keys from `combinedData` and check which columns are not empty
            const nonEmptyColumns = [
              "Name",
              "ProfileURL",
              "Location",
              "Industry",
              "Employees",
              "Designation",
              "Organization",
              "OrganizationURL",
              "About",
            ].filter((column) =>
              combinedData.some(
                (row) => row[column] && row[column].trim() !== ""
              )
            );

            // Generate CSV only for the non-empty columns
            return Papa.unparse(combinedData, {
              columns: nonEmptyColumns,
            });
          })();
          setCsvData(csv);
          setTableSheetCount(combinedData.length);
        });
      });
    } catch (error) {
      console.error("Error scraping list data", error);
    }
  };

  const downloadCSV = () => {
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
    chrome.storage.local.remove("scrapedListData", () => {
      setCsvData("");
      setTableSheetCount(0);
      console.log("Scraped data cleared.");
    });
  };

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800">Account Scraper</h1>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            Scrape data from{" "}
            <a
              href="https://www.linkedin.com/sales/search/company"
              target="_blank"
              className="text-blue-600 hover:text-blue-700 font-semibold underline decoration-2 underline-offset-2"
            >
              LinkedIn Account Pages
            </a>
            <br />
            <span className="text-gray-500">Make sure you've filtered your results first</span>
          </p>
        </div>
      </div>

      

      {/* Action Section */}
      <div className="space-y-4">
        <button
          onClick={fetchListData}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Scrape Account Data
        </button>

        {/* Stats Card */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{tableSheetCount}</p>
            <p className="text-sm text-gray-500 font-medium">Total Records Scraped</p>
          </div>
        </div>

        {/* Download Actions */}
        {csvData && (
          <div className="space-y-3">
            <button
              onClick={downloadCSV}
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
        <p className="text-xs text-gray-400">LinkedIn Sales Navigator Scraper • v1.1</p>
      </div>
    </div>
  );
};
export default AccountList;