module.exports = {
  src_folders: ['webdriver/specs'],
  output_folder: 'webdriver/reports',
  selenium: {
    start_process: true,
    server_path: require('selenium-server').path,
    host: '127.0.0.1',
    port: 4444,
    cli_args: {
      'WebDriver.chrome.driver': require('chromedriver').path
    }
  },
  test_settings: {
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args : ["--no-sandbox", "window-size=1880,1000"],
          w3c: false
        },
      }
    }
  }
}