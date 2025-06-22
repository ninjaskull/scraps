import { useState } from "react";
import { FaList, FaDownload, FaTrash } from "react-icons/fa";

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

          const table = document.querySelector('table');
          return table ? { tableHTML: table.outerHTML } : { tableHTML: 'No table found' };
        },
      });

      if (response[0].result.tableHTML !== 'No table found') {
        await processTableData(response[0].result.tableHTML);
      }
    } catch (error) {
      console.error('Error scraping lead page', error);
    }
  };

  const processTableData = async (tableHTML) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = tableHTML;
      const table = tempDiv.querySelector('table');
      const headerElements = Array.from(table.querySelectorAll('thead th'));
      const rowElements = Array.from(table.querySelectorAll('tbody tr'));

      const headers = headerElements.map(th => th.textContent.trim());
      headers.splice(1, 0, 'Profile URL');
      headers.splice(2, 0, 'Designation');

      const outreachIndex = headers.indexOf('Outreach activity');

      const rows = rowElements.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const nameElement = cells[0]?.querySelector('a span');
        const name = nameElement ? nameElement.textContent.trim() : 'Name not found';

        const linkElement = cells[0]?.querySelector('a');
        const profileLink = linkElement ? linkElement.getAttribute('href') : 'Link not found';

        const designationElement = cells[0]?.querySelector('div[data-anonymize="job-title"]');
        const designation = designationElement ? designationElement.textContent.trim() : 'Designation not found';

        const outreachElement = cells[outreachIndex - 2]?.querySelector('button span.lists-table__outreach-activity-text');
        const outreachActivity = outreachElement ? outreachElement.textContent.trim() : 'Outreach Activity Not Found';

        const rowData = cells.map((cell, index) => {
          if (index === 0) return name;
          if (index === outreachIndex - 2) return outreachActivity;
          return cell.textContent.trim();
        });

        rowData.splice(1, 0, `https://www.linkedin.com${profileLink}`);
        rowData.splice(2, 0, designation);

        return rowData;
      });

      const existingData = await new Promise(resolve => {
        chrome.storage.local.get(['scrapedData'], result => {
          resolve(result.scrapedData || []);
        });
      });

      const finalData = existingData.length > 0 && existingData[0].every((header, index) => header === headers[index])
        ? [...existingData, ...rows]
        : [headers, ...existingData, ...rows];

      chrome.storage.local.set({ scrapedData: finalData });
      setTableSheetCount(finalData.length - 1);

      const Papa = window.Papa || { unparse: (data) => {
        const csvRows = [];
        data.forEach(row => {
          const values = row.map(value => `"${String(value).replace(/"/g, '""')}"`);
          csvRows.push(values.join(','));
        });
        return csvRows.join('\n');
      }};

      const csvContent = Papa.unparse(finalData);
      setCsvData(csvContent);
    } catch (error) {
      console.error('Error converting table to CSV:', error);
    }
  };

  const downloadCSV = () => {
    if (!csvData) return;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scrapo_leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearData = () => {
    chrome.storage.local.remove('scrapedData', () => {
      setCsvData("");
      setTableSheetCount(0);
    });
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <FaList className="text-purple-400 text-lg" />
          <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Lead Scraper
          </h2>
        </div>
        <p className="text-gray-300 text-sm mb-4">
          Extract lead data from LinkedIn Sales Navigator lead lists.
        </p>

        <button
          onClick={fetchLeadData}
          className="w-full bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500/90 hover:to-pink-500/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-center gap-2">
            <FaList />
            <span>Scrape Leads</span>
          </div>
        </button>
      </div>

      {tableSheetCount > 0 && (
        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-emerald-400">
              Data Ready ({tableSheetCount} leads)
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

export default LeadList;