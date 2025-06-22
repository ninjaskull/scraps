
/* eslint-disable no-undef */
import { useState } from "react";
import { IoPlay, IoStop } from "react-icons/io5";
import { MdPages } from "react-icons/md";
import Papa from "papaparse";

const MultiPageScraper = () => {
  const [csvData, setCsvData] = useState("");
  const [tableSheetCount, setTableSheetCount] = useState(0);
  const [pagesToScrape, setPagesToScrape] = useState(5);
  const [isScrapingMultiple, setIsScrapingMultiple] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [scrapingType, setScrapingType] = useState("accounts"); // "accounts" or "leads"

  const startMultiPageScraping = async () => {
    setIsScrapingMultiple(true);
    setCurrentPage(1);
    let shouldContinue = true;
    
    try {
      // Clear previous data
      const storageKey = scrapingType === "accounts" ? "scrapedListData" : "scrapedData";
      await new Promise(resolve => {
        chrome.storage.local.remove(storageKey, () => resolve());
      });
      setCsvData("");
      setTableSheetCount(0);

      for (let page = 1; page <= pagesToScrape && shouldContinue; page++) {
        setCurrentPage(page);
        console.log(`🔄 Starting page ${page} of ${pagesToScrape}`);
        
        // Scrape current page
        try {
          if (scrapingType === "accounts") {
            await scrapeAccountPage();
          } else {
            await scrapeLeadPage();
          }
          console.log(`✅ Successfully scraped page ${page}`);
        } catch (scrapeError) {
          console.error(`Error scraping page ${page}:`, scrapeError);
          // Continue to next page even if current page fails
        }
        
        // Navigate to next page if not the last page
        if (page < pagesToScrape) {
          console.log(`🔄 Navigating to page ${page + 1}...`);
          const navigationSuccess = await navigateToNextPage();
          if (!navigationSuccess) {
            console.log(`❌ Failed to navigate to page ${page + 1}. Stopping scraping.`);
            shouldContinue = false;
            break;
          }
          // Wait longer for page to fully load
          console.log(`⏳ Waiting for page ${page + 1} to load...`);
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
      }
      
      console.log(`✅ Completed scraping ${pagesToScrape} pages`);
    } catch (error) {
      console.error("Error during multi-page scraping:", error);
    } finally {
      setIsScrapingMultiple(false);
      setCurrentPage(0);
    }
  };

  const stopMultiPageScraping = () => {
    setIsScrapingMultiple(false);
    setCurrentPage(0);
    console.log('🛑 Multi-page scraping stopped by user');
  };

  const navigateToNextPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const delay = ms => new Promise(res => setTimeout(res, ms));
          
          console.log('🔍 Looking for next page button...');
          
          // Enhanced selectors for LinkedIn Sales Navigator pagination
          const nextButtonSelectors = [
            'button[aria-label="Next"]',
            'button[aria-label="Go to next page"]',
            'button[data-test-pagination-page-btn="next"]',
            '.artdeco-pagination__button--next',
            'button.artdeco-pagination__button--next',
            '.artdeco-pagination__indicator--number + button',
            'button[data-control-name="page_next"]',
            'button:has([data-test-icon="chevron-right-small"])',
            '.pv-s-list-paging__next-text',
            '.artdeco-pagination .artdeco-pagination__pages li:last-child button',
            'button[data-test-icon="chevron-right"]',
            '.ember-view .artdeco-pagination__button--next'
          ];
          
          let nextButton = null;
          let buttonInfo = '';
          
          for (const selector of nextButtonSelectors) {
            try {
              const buttons = document.querySelectorAll(selector);
              console.log(`Selector "${selector}" found ${buttons.length} buttons`);
              
              for (const button of buttons) {
                if (button && 
                    !button.disabled && 
                    !button.classList.contains('disabled') &&
                    !button.hasAttribute('disabled') &&
                    button.offsetParent !== null) { // Check if element is visible
                  nextButton = button;
                  buttonInfo = `Found button with selector: ${selector}`;
                  break;
                }
              }
              
              if (nextButton) break;
            } catch (e) {
              console.log(`Error with selector "${selector}":`, e);
            }
          }
          
          if (nextButton) {
            console.log('✅ Next button found:', buttonInfo);
            console.log('🔄 Clicking next page...');
            
            // Scroll to the button first
            nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(2000);
            
            // Store current URL to verify page change
            const currentUrl = window.location.href;
            
            // Click the button using different methods
            try {
              nextButton.click();
            } catch (clickError) {
              console.log('Regular click failed, trying dispatch event');
              nextButton.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              }));
            }
            
            // Wait for page transition
            await delay(4000);
            
            // Verify the page actually changed
            const newUrl = window.location.href;
            const pageChanged = currentUrl !== newUrl;
            
            console.log(`Page change verification: ${pageChanged ? 'SUCCESS' : 'FAILED'}`);
            console.log(`Old URL: ${currentUrl}`);
            console.log(`New URL: ${newUrl}`);
            
            return pageChanged;
          } else {
            console.log('❌ No valid next button found');
            
            // Debug: log all pagination related elements
            const paginationElements = document.querySelectorAll('[class*="pagination"], [data-test*="pagination"], button[aria-label*="Next"], button[aria-label*="next"]');
            console.log(`Found ${paginationElements.length} pagination-related elements`);
            paginationElements.forEach((el, index) => {
              console.log(`Element ${index}:`, {
                tagName: el.tagName,
                className: el.className,
                ariaLabel: el.getAttribute('aria-label'),
                disabled: el.disabled,
                visible: el.offsetParent !== null
              });
            });
            
            return false;
          }
        },
      });
      
      return result[0].result;
    } catch (error) {
      console.error("Error navigating to next page:", error);
      return false;
    }
  };

  const scrapeAccountPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          // Same scroll logic as AccountList
          const scrollToEndAndBackToTop = async () => {
            const delay = ms => new Promise(res => setTimeout(res, ms));

            const container = Array.from(document.querySelectorAll('div'))
              .find(el => el.scrollHeight > el.clientHeight && el.clientHeight > 300)
              || document.scrollingElement || window;

            if (!container) {
              console.error('❌ No scrollable container found.');
              return;
            }

            console.log('🌀 Starting human‑like scroll to bottom...');

            const maxScroll = container === window ? document.body.scrollHeight : container.scrollHeight;
            const scrollPercentages = [0, 0.05, 0.33, 0.66, 1.0];
            
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

            await delay(1500);
            console.log('✅ Reached bottom of current page.');

            console.log('🔼 Scrolling back to top...');
            if (container === window) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
            await delay(1000);
            console.log('🏁 Returned to top.');
          };

          await scrollToEndAndBackToTop();

          // Same scraping logic as AccountList
          const listItems = document.querySelectorAll(".artdeco-list .artdeco-list__item");
          const extractedData = Array.from(listItems).map((item) => {
            const addIfExists = (key, value) => value ? { [key]: value.trim() } : {};

            const nameElement = item.querySelector(".artdeco-entity-lockup__title a");
            const name = nameElement ? nameElement.textContent.trim() : null;
            const profileLink = nameElement ? `https://www.linkedin.com${nameElement.getAttribute("href")}` : null;

            const industryElement = item.querySelector(".artdeco-entity-lockup__subtitle span[data-anonymize='industry']");
            const industry = industryElement ? industryElement.textContent.trim() : null;

            const employeesElement = item.querySelector("a.li-i18n-linkto._view-all-employees_1derdc");
            const employees = employeesElement ? employeesElement.textContent.trim() : null;

            const aboutElement = item.querySelector("dd.t-12.t-black--light.mb3 div span:nth-child(2)");
            const about = aboutElement ? aboutElement.textContent.trim().replace("…see more", "").trim() : null;

            const designationElement = item.querySelector(".artdeco-entity-lockup__subtitle span[data-anonymize='title']");
            const designation = designationElement ? designationElement.textContent.trim() : null;

            const organizationElement = item.querySelector(".artdeco-entity-lockup__subtitle a[data-anonymize='company-name']");
            const organization = organizationElement ? organizationElement.textContent.trim() : null;
            const organizationUrl = organizationElement ? `https://www.linkedin.com${organizationElement.getAttribute("href")}` : null;

            const locationElement = item.querySelector(".artdeco-entity-lockup__caption span[data-anonymize='location']");
            const location = locationElement ? locationElement.textContent.trim() : null;

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
        const combinedData = [...existingData, ...newData];

        chrome.storage.local.set({ scrapedListData: combinedData }, () => {
          const csv = (() => {
            const nonEmptyColumns = [
              "Name", "ProfileURL", "Location", "Industry", "Employees",
              "Designation", "Organization", "OrganizationURL", "About",
            ].filter((column) =>
              combinedData.some((row) => row[column] && row[column].trim() !== "")
            );

            return Papa.unparse(combinedData, { columns: nonEmptyColumns });
          })();
          setCsvData(csv);
          setTableSheetCount(combinedData.length);
        });
      });
    } catch (error) {
      console.error("Error scraping account page", error);
    }
  };

  const scrapeLeadPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          // Same scroll logic as LeadList
          const scrollToEndAndBackToTop = async () => {
            const delay = ms => new Promise(res => setTimeout(res, ms));

            const container = Array.from(document.querySelectorAll('div'))
              .find(el => el.scrollHeight > el.clientHeight && el.clientHeight > 300)
              || document.scrollingElement || window;

            if (!container) {
              console.error('❌ No scrollable container found.');
              return;
            }

            console.log('🌀 Starting human‑like scroll to bottom...');

            const maxScroll = container === window ? document.body.scrollHeight : container.scrollHeight;
            const scrollPercentages = [0, 0.05, 0.33, 0.66, 1.0];
            
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

            await delay(1500);
            console.log('✅ Reached bottom of current page.');

            console.log('🔼 Scrolling back to top...');
            if (container === window) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
            await delay(1000);
            console.log('🏁 Returned to top.');
          };

          await scrollToEndAndBackToTop();

          const tableElement = document.querySelector("table");
          if (tableElement) {
            return { tableHTML: tableElement.outerHTML };
          }
          return { tableHTML: "No table found" };
        },
      });

      const data = response[0].result;
      if (data.tableHTML !== "No table found") {
        await convertTableToCsv(data.tableHTML);
      }
    } catch (error) {
      console.error("Error scraping lead page", error);
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
      headerArray.splice(1, 0, "Profile URL");
      headerArray.splice(2, 0, "Designation");

      const outreachActivityIndex = headerArray.indexOf("Outreach activity");

      const dataArray = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));

        const nameCell = cells[0]?.querySelector("a span");
        const name = nameCell ? nameCell.textContent.trim() : "Name not found";

        const profileLinkElement = cells[0]?.querySelector("a");
        const profileLink = profileLinkElement ? profileLinkElement.getAttribute("href") : "Link not found";

        const designationCell = cells[0]?.querySelector("div[data-anonymize='job-title']");
        const designation = designationCell ? designationCell.textContent.trim() : "Designation not found";

        const outreachActivityCell = cells[outreachActivityIndex - 2]?.querySelector("button span.lists-table__outreach-activity-text");
        const outreachActivity = outreachActivityCell ? outreachActivityCell.textContent.trim() : "Outreach Activity Not Found";

        const rowData = cells.map((cell, index) => {
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

      const isHeaderIncluded = previousData.length > 0 && previousData[0].every((header, index) => header === headerArray[index]);
      const combinedData = isHeaderIncluded ? [...previousData, ...dataArray] : [headerArray, ...previousData, ...dataArray];

      chrome.storage.local.set({ scrapedData: combinedData });
      setTableSheetCount(combinedData.length - 1);

      const csv = Papa.unparse(combinedData);
      setCsvData(csv);
    } catch (error) {
      console.error("Error converting table to CSV", error);
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
    link.download = "linkedin_multi_page_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    clearData();
  };

  const clearData = () => {
    const storageKey = scrapingType === "accounts" ? "scrapedListData" : "scrapedData";
    chrome.storage.local.remove(storageKey, () => {
      setCsvData("");
      setTableSheetCount(0);
      console.log("Scraped data cleared.");
    });
  };

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-emerald-50 to-teal-100 min-h-screen">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <MdPages className="text-white text-lg" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Multi-Page Scraper</h1>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            Advanced scraper for{" "}
            <span className="text-emerald-600 font-semibold">LinkedIn Sales Navigator</span>
            <br />
            <span className="text-gray-500">Automatically scrape multiple pages</span>
          </p>
        </div>
      </div>

      

      {/* Configuration Section */}
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 space-y-4">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Configuration</h3>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Scraping Type:
          </label>
          <select
            value={scrapingType}
            onChange={(e) => setScrapingType(e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            disabled={isScrapingMultiple}
          >
            <option value="accounts">📊 Account Pages</option>
            <option value="leads">👥 Lead List Pages</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Pages:
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={pagesToScrape}
            onChange={(e) => setPagesToScrape(parseInt(e.target.value) || 1)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            disabled={isScrapingMultiple}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 50 pages per session</p>
        </div>
      </div>

      {/* Progress Section */}
      {isScrapingMultiple && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-blue-800 font-semibold">
              Scraping page {currentPage} of {pagesToScrape}
            </span>
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(currentPage / pagesToScrape) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-600 mt-2 text-center">
            {Math.round((currentPage / pagesToScrape) * 100)}% Complete
          </p>
        </div>
      )}

      {/* Action Section */}
      <div className="space-y-4">
        {!isScrapingMultiple ? (
          <button
            onClick={startMultiPageScraping}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <IoPlay className="text-xl" />
            Start Multi-Page Scraping
          </button>
        ) : (
          <button
            onClick={stopMultiPageScraping}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <IoStop className="text-xl" />
            Stop Scraping
          </button>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{tableSheetCount}</p>
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
              Download Multi-Page CSV
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
        <p className="text-xs text-gray-400">Multi-Page Scraper • Advanced Features • v1.1</p>
      </div>
    </div>
  );
};

export default MultiPageScraper;
