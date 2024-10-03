const {Builder, By, until, Key} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const assert = require('chai').assert;

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Some tests need to access the MINERVA proxy to, e.g., check which elements are highlighted. However, the tests
// do not run in the same scope as the plugin and thus they do not have access to the Proxy. Therefore, the plugin
// exposes the proxy by attaching it as a data attribute to the main div element.
const pluginName = 'adr';
const pluginLabel = 'Drug reactions';
const minervaProxyContainerClass = pluginName + '-container';
const minervaProxyCode = `$('.${minervaProxyContainerClass}').data('minervaProxy')`;


function minervaLogin() {

    const xhr = new XMLHttpRequest();

    return new Promise(function (resolve, reject) {

        xhr.onreadystatechange = function () {

            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.open("POST", 'http://localhost:8080/minerva/api/doLogin', false);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send("login=admin&password=admin");
    });
}

async function getRequest(uri) {

    const xhr = new XMLHttpRequest();

    return new Promise(function (resolve, reject) {

        xhr.onreadystatechange = function () {

            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.open("GET", uri);
        xhr.send();
    });
}

async function getPluginHash(){
    return getRequest('http://localhost:8080/minerva/api/plugins/').then(function (pluginsResponse) {
        let hashes = JSON.parse(pluginsResponse.responseText).filter(plugin => plugin.name === pluginLabel);
        if (hashes.length === 0){
            // when tested withing CI there is only one plugin, the current one and it's name is test
            hashes = JSON.parse(pluginsResponse.responseText);
        }
        return hashes[hashes.length -1].hash;
    });
}

describe("drug reactions plugin", async function() {

    //Some functions can take a lot of time as they need, for isntance, start MINERVA interface
    this.timeout(600000);

    let driver;
    let pluginContainer;

    function wait(timeInMs) {
        return driver.executeAsyncScript(`
            const callback = arguments[arguments.length - 1];
            setTimeout(()=>callback(), ${timeInMs})`);
    }

    function deHighlightAll(){
        return driver.executeScript(`minervaProxy = ${minervaProxyCode}; minervaProxy.project.map.getHighlightedBioEntities().then( highlighted => minervaProxy.project.map.hideBioEntity(highlighted) )`);
    }

    async function getHighlighted(){
        return driver.executeAsyncScript(`
                    var callback = arguments[arguments.length - 1];
                    ${minervaProxyCode}.project.map.getHighlightedBioEntities().then(highlighted => callback(highlighted));                    
                `);
    }

    before(async function () {
        const opts = new chrome.Options().addArguments('--no-sandbox', '--headless', '--remote-debugging-port=9222');
        driver = await new Builder().setChromeOptions(opts).forBrowser('chrome').build();
        // driver = await new Builder().forBrowser('chrome').build();

        await driver.manage().window().maximize();

        const loginResponse = await minervaLogin();
        const minervaToken = JSON.parse(loginResponse.responseText).token;

        await driver.get('http://localhost:8080');
        await driver.manage().addCookie({name: 'MINERVA_AUTH_TOKEN', value: minervaToken});
        const pluginHash = await getPluginHash();

        await driver.get(`http://localhost:8080/minerva/index.xhtml?id=single-map&plugins=${pluginHash}`);

        pluginContainer = await driver.wait(until.elementLocated(By.css(`.${minervaProxyContainerClass}`)));
        await driver.wait(until.elementLocated(By.css('.adr-table')));
    });

    it("should have arcalys", async function () {
        const aracalyst = await driver.executeScript(function () {
            return $('.adr-table td:contains("Arcalyst")');
        });

        assert.equal(aracalyst.length, 2);
    });
    
    it("should highlight entities", async function () {
        const highlighted = await getHighlighted();

        assert.isAbove(highlighted.length, 2);
    });

    describe("search", async function () {
        let search;
        before(async function () {
            search = driver.findElement(By.css('.search input'));
            await search.sendKeys("Arcalyst");
            await search.sendKeys(Key.ENTER);
            await wait(1000);
        });

        it("should filter and highlight", async function () {
            let recs = await driver.findElements(By.css(".adr-table tbody tr"));
            assert.equal(recs.length, 2);

            const highlighted = await getHighlighted();
            assert.equal(highlighted.length, 2);

            // await search.clear(); //this does not work in container for some reason, the following jquery solution is a workaround
            await driver.executeScript(function () {
                $(".search input").trigger($.Event( "keyup", { keyCode: 13 } ));
            });

            await driver.wait(async function () {
                return await driver.executeScript(function () {
                    return $(".adr-table tbody tr").length
                }) > 2;
            }, 5000);

            recs = await driver.findElements(By.css(".adr-table tbody tr"));
            assert.isAbove(recs.length, 2);
        })
    });

    after(async function finishWebDriver() {
        await driver.quit();
    });
});