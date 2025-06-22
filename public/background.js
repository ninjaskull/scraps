
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const allowedUrl = "https://www.linkedin.com/sales";

  // Check if the current tab's URL matches the allowed URL
  if (tab.url && tab.url.startsWith(allowedUrl)) {
    // Change the icon to the enabled state
    chrome.action.setIcon({ path: "images/scrapo_128.png", tabId });
    chrome.action.enable(tabId); // Enable the action
  } else {
    // Keep icon visible but indicate it's for LinkedIn Sales Navigator only
    chrome.action.setIcon({ path: "images/scrapo_128.png", tabId });
    chrome.action.enable(tabId); // Keep enabled so users can see it
  }
});
