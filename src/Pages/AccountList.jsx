import { useState } from "react";
import { FaBuilding, FaDownload, FaTrash } from "react-icons/fa";

const AccountList = () => {
  const [csvData, setCsvData] = useState("");
  const [scrapedDataCount, setScrapedDataCount] = useState(0);

  const fetchAccountData = async () => {
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

  const downloadCSV = () => {
    if (!csvData) return;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scrapo_accounts.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearData = () => {
    chrome.storage.local.remove('scrapedListData', () => {
      setCsvData("");
      setScrapedDataCount(0);
    });
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <FaBuilding className="text-blue-400 text-lg" />
          <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Account Scraper
          </h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">
          Extract account information from LinkedIn Sales Navigator search results.
        </p>

        <button
          onClick={fetchAccountData}
          className="w-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-500/90 hover:to-purple-500/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-center gap-2">
            <FaBuilding />
            <span>Scrape Accounts</span>
          </div>
        </button>
      </div>

      {scrapedDataCount > 0 && (
        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-emerald-400">
              Data Ready ({scrapedDataCount} accounts)
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="flex-1 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500/90 hover:to-teal-500/90 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl"
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

export default AccountList;