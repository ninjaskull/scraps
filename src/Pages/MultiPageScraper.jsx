import { useState } from "react";
import { FaPlay, FaStop, FaDownload, FaTrash } from "react-icons/fa";
import { MdPages } from "react-icons/md";

const MultiPageScraper = () => {
  const [csvData, setCsvData] = useState("");
  const [scrapedDataCount, setScrapedDataCount] = useState(0);
  const [isScrapingMultiple, setIsScrapingMultiple] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [scrapingType, setScrapingType] = useState("accounts"); // "accounts" or "leads"
  const [pagesToScrape, setPagesToScrape] = useState(5);

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
                    button.offsetParent !== null) {
                  nextButton = button;
                  buttonInfo = `Found button with selector: ${selector}`;
                  break;
                }
              }
              if (nextButton) break;
            } catch (error) {
              console.log(`Error with selector "${selector}":`, error);
            }
          }

          if (nextButton) {
            console.log('✅ Next button found:', buttonInfo);
            console.log('🔄 Clicking next page...');

            nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(2000);

            const currentURL = window.location.href;

            try {
              nextButton.click();
            } catch {
              console.log('Regular click failed, trying dispatch event');
              nextButton.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              }));
            }

            await delay(4000);

            const newURL = window.location.href;
            const pageChanged = currentURL !== newURL;

            console.log(`Page change verification: ${pageChanged ? 'SUCCESS' : 'FAILED'}`);
            console.log(`Old URL: ${currentURL}`);
            console.log(`New URL: ${newURL}`);

            return pageChanged;
          } else {
            console.log('❌ No valid next button found');
            const paginationElements = document.querySelectorAll('[class*="pagination"], [data-test*="pagination"], button[aria-label*="Next"], button[aria-label*="next"]');
            console.log(`Found ${paginationElements.length} pagination-related elements`);

            paginationElements.forEach((element, index) => {
              console.log(`Element ${index}:`, {
                tagName: element.tagName,
                className: element.className,
                ariaLabel: element.getAttribute('aria-label'),
                disabled: element.disabled,
                visible: element.offsetParent !== null
              });
            });

            return false;
          }
        }
      });

      return result[0].result;
    } catch (error) {
      console.error('Error navigating to next page:', error);
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
            const maxHeight = container === window ? document.body.scrollHeight : container.scrollHeight;
            const scrollSteps = [0, 0.05, 0.33, 0.66, 1];

            for (let i = 0; i < scrollSteps.length; i++) {
              const scrollPosition = Math.min(maxHeight, maxHeight * scrollSteps[i]);
              if (container === window) {
                window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
              } else {
                container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
              }
              console.log(`→ Scrolled to ${(scrollSteps[i] * 100).toFixed(0)}%`);
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

          const accountItems = document.querySelectorAll('.artdeco-list .artdeco-list__item');

          return Array.from(accountItems).map(item => {
            const getTextContent = (field, element) => element ? { [field]: element.trim() } : {};

            const nameElement = item.querySelector('.artdeco-entity-lockup__title a');
            const name = nameElement ? nameElement.textContent.trim() : null;
            const profileURL = nameElement ? `https://www.linkedin.com${nameElement.getAttribute('href')}` : null;

            const industryElement = item.querySelector('.artdeco-entity-lockup__subtitle span[data-anonymize="industry"]');
            const industry = industryElement ? industryElement.textContent.trim() : null;

            const employeesElement = item.querySelector('a.li-i18n-linkto._view-all-employees_1derdc');
            const employees = employeesElement ? employeesElement.textContent.trim() : null;

            const aboutElement = item.querySelector('dd.t-12.t-black--light.mb3 div span:nth-child(2)');
            const about = aboutElement ? aboutElement.textContent.trim().replace('…see more', '').trim() : null;

            const designationElement = item.querySelector('.artdeco-entity-lockup__subtitle span[data-anonymize="title"]');
            const designation = designationElement ? designationElement.textContent.trim() : null;

            const organizationElement = item.querySelector('.artdeco-entity-lockup__subtitle a[data-anonymize="company-name"]');
            const organization = organizationElement ? organizationElement.textContent.trim() : null;
            const organizationURL = organizationElement ? `https://www.linkedin.com${organizationElement.getAttribute('href')}` : null;

            const locationElement = item.querySelector('.artdeco-entity-lockup__caption span[data-anonymize="location"]');
            const location = locationElement ? locationElement.textContent.trim() : null;

            return {
              ...getTextContent('Name', name),
              ...getTextContent('ProfileURL', profileURL),
              ...getTextContent('Industry', industry),
              ...getTextContent('Employees', employees),
              ...getTextContent('About', about),
              ...getTextContent('Designation', designation),
              ...getTextContent('Organization', organization),
              ...getTextContent('OrganizationURL', organizationURL),
              ...getTextContent('Location', location)
            };
          });
        },
      });

      chrome.storage.local.get('scrapedListData', (result) => {
        const newData = [...(result.scrapedListData || []), ...response[0].result];
        chrome.storage.local.set({ scrapedListData: newData }, () => {
          const csvContent = (() => {
            const headers = ['Name', 'ProfileURL', 'Location', 'Industry', 'Employees', 'Designation', 'Organization', 'OrganizationURL', 'About']
              .filter(header => newData.some(row => row[header] && row[header].trim() !== ''));

            const Papa = window.Papa || { unparse: (data, options) => {
              const csvRows = [];
              const headers = options.columns;
              csvRows.push(headers.join(','));

              data.forEach(row => {
                const values = headers.map(header => {
                  const value = row[header] || '';
                  return `"${value.replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
              });

              return csvRows.join('\n');
            }};

            return Papa.unparse(newData, { columns: headers });
          })();
          setCsvData(csvContent);
          setScrapedDataCount(newData.length);
        });
      });
    } catch (error) {
      console.error('Error scraping account page', error);
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
      setScrapedDataCount(combinedData.length - 1);

      const csv = Papa.unparse(combinedData);
      setCsvData(csv);
    } catch (error) {
      console.error("Error converting table to CSV", error);
    }
  };

  const startMultiPageScraping = async () => {
    setIsScrapingMultiple(true);
    setCurrentPage(1);

    let pageNumber = 1;
    let canContinue = true;

    while (canContinue && pageNumber <= pagesToScrape) {
      // Check if user stopped scraping
      if (!isScrapingMultiple) {
        console.log('🛑 Scraping stopped by user');
        break;
      }

      console.log(`🔄 Scraping page ${pageNumber} of ${pagesToScrape}...`);
      setCurrentPage(pageNumber);
      
      try {
        if (scrapingType === "accounts") {
          await scrapeAccountPage();
        } else {
          await scrapeLeadPage();
        }

        console.log(`✅ Page ${pageNumber} scraped successfully`);

        // Don't try to navigate if this is the last page we want to scrape
        if (pageNumber < pagesToScrape) {
          console.log(`🔄 Navigating to page ${pageNumber + 1}...`);
          const hasNextPage = await navigateToNextPage();

          if (hasNextPage) {
            pageNumber++;
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 4000));
          } else {
            console.log('🏁 No more pages available to scrape');
            canContinue = false;
          }
        } else {
          pageNumber++;
        }
      } catch (error) {
        console.error(`❌ Error scraping page ${pageNumber}:`, error);
        canContinue = false;
      }
    }

    setIsScrapingMultiple(false);
    setCurrentPage(0);
    console.log('✅ Multi-page scraping completed');
  };

  const stopMultiPageScraping = () => {
    setIsScrapingMultiple(false);
    setCurrentPage(0);
    console.log('🛑 Multi-page scraping stopped by user');
  };

  const downloadCSV = () => {
    if (!csvData) return;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scrapo_multipage.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearData = () => {
    const storageKey = scrapingType === "accounts" ? "scrapedListData" : "scrapedData";
    chrome.storage.local.remove(storageKey, () => {
      setCsvData("");
      setScrapedDataCount(0);
    });
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <MdPages className="text-emerald-400 text-lg" />
          <h2 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Multi-Page Scraper
          </h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">
          Automatically scrape all pages in search results.
        </p>
        
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Scraping Type:
          </label>
          <select
            value={scrapingType}
            onChange={(e) => setScrapingType(e.target.value)}
            className="w-full p-3 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-black"
            disabled={isScrapingMultiple}
          >
            <option value="accounts">📊 Account Pages</option>
            <option value="leads">👥 Lead List Pages</option>
          </select>
        </div>
        
         <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Number of Pages:
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={pagesToScrape}
            onChange={(e) => setPagesToScrape(parseInt(e.target.value) || 1)}
            className="w-full p-3 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-black"
            disabled={isScrapingMultiple}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum 50 pages per session</p>
        </div>

        {!isScrapingMultiple ? (
          <button
            onClick={startMultiPageScraping}
            className="w-full bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/90 hover:to-teal-500/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-center gap-2">
              <FaPlay />
              <span>Start Multi-Page Scraping</span>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-3 border border-emerald-400/30">
              <p className="text-emerald-300 text-sm text-center">
                Scraping in progress... Page {currentPage} of {pagesToScrape}
              </p>
              <div className="w-full bg-emerald-900/40 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentPage / pagesToScrape) * 100}%` }}
                ></div>
              </div>
              <p className="text-emerald-400 text-xs text-center mt-1">
                {Math.round((currentPage / pagesToScrape) * 100)}% Complete
              </p>
            </div>

            <button
              onClick={stopMultiPageScraping}
              className="w-full bg-gradient-to-r from-red-600/80 to-pink-600/80 hover:from-red-500/90 hover:to-pink-500/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <FaStop />
                <span>Stop Scraping</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {scrapedDataCount > 0 && (
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-purple-400">
              Data Ready ({scrapedDataCount} accounts)
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="flex-1 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500/90 hover:to-pink-500/90 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <FaDownload className="text-sm" />
                <span className="text-sm">Download CSV</span>
              </div>
            </button>

            <button
              onClick={clearData}
              className="flex-1 bg-gradient-to-r from-red-600/80 to-pink-600/80 hover:from-red-500/90 hover:to-pink-500/90 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <FaTrash className="text-sm" />
                <span className="text-sm">Clear Data</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="text-center pt-4 border-t border-white/10">
        <p className="text-xs text-gray-400">
          Scrapo v1.1 • Built for efficiency
        </p>
      </div>
    </div>
  );
};

export default MultiPageScraper;