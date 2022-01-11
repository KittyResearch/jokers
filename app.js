// Check if object exists
function exists(obj) {
    return eval("typeof " + obj + " !== 'undefined' && " + obj + "!== null");
}

const ERROR = "!!!~~~METHOD EXECUTION ERROR~~~!!!";

// Web3Modal Provider
// const providerOptions = {
//     walletconnect: {
//       package: WalletConnectProvider.default,
//         options: {
//             infuraId: "5be4fb52a8f9497dbbfef89b8a5c2cab"
//         }
//     }
// };

// Web3Modal Provider
const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider.default,
        options: {
            rpc: {
                56: "https://bsc-dataseed.binance.org/",
                97: "https://data-seed-prebsc-1-s1.binance.org:8545/"
            }
        }
    }
};

// Execute button
const methodTypeColor = {
    "payable": "#d9534f",
    "nonpayable": "#f0ad4e",
    "view": "#5cb85c",
    "pure": "#5bc0de"
}

// Web3
var web3;
var web3min;
var web3Modal;
var provider;

// External ABI
var loadedABI;

// Contract
var contract;
var abi;

// Interaction
var methods;
var selectedMethod;
var methodArguments;
var outputArea;
var consoleArea;

// Network
var network = "chapel"; //"ropsten";
var address;

// Wallet
var walletNetwork;
var isWalletConnected;
var isWalletOnSameNetwork;

// Add removal function to String
String.prototype.remove = function (s) {
    return this.replaceAll(s, "");
};

// Deep-copy using JSON
function JSONCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Make it pretty
function JSONPretty(obj) {
    return JSON.stringify(obj, null, 2).replace(
        /\n( *)/g,
        function (match, p1) {
            return '<br>' + '&nbsp;'.repeat(p1.length);
        }
    );
}

// Make it pretty
function prettyArray(a) {
    return String(a).replaceAll(",", ", ");
}

// Show what went wrong
function showError(error) {
    console.log(`Error: ${error}`);
}

function isAddress(str) {
    return str.startsWith("0x");
}

function isAddressField(str) {
    return (isAddress(str) || str == "this");
}

function connectWallet() {
  if (isWalletConnected) {
      onDisconnect();
  }
  else {
      onConnect();
  }
}

async function onConnect() {
    document.getElementById("button wallet").disabled = true;
    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        document.getElementById("button wallet").disabled = false;
        console.log("Could not get a wallet connection:", e);
      return;
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        updateNetworkConnection();
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        updateNetworkConnection();
    });

    // Subscribe to networkId change
    provider.on("networkChanged", (networkId) => {
        updateNetworkConnection();
    });

    try {
        await updateNetworkConnection();
    }
    catch (e) {
        console.log("Error fetching account details:", e);
        onDisconnect();
    }

    document.getElementById("button wallet").innerHTML = "Disconnect";
    document.getElementById("button wallet").style.backgroundColor = "#FF3333";
    document.getElementById("connection").style.display = "table";
    document.getElementById("content").style.height = "calc(100% - 4.4em)";
    document.getElementById("button wallet").disabled = false;
    document.getElementById("button interact").style.display = "inline-block";

    setTransactionsURL();

    isWalletConnected = true;
}

async function onDisconnect() {
    document.getElementById("button wallet").disabled = true;
    console.log("Killing the wallet connection", provider);

    if(provider && provider.close) {
        await provider.close();
        await web3Modal.clearCachedProvider();
        provider = null;
    }

    selectedAccount = null;
    web3 = defaultWeb3(network);

    document.getElementById("button wallet").innerHTML = "Connect Wallet";
    document.getElementById("button wallet").style.backgroundColor = "#1E90FF";
    document.getElementById("connection").style.display = "none";
    document.getElementById("content").style.height = "calc(100% - 2.2em)";
    document.getElementById("button wallet").disabled = false;
    document.getElementById("button interact").style.display = "none";

    isWalletConnected = false;
}

async function updateGasPrice() {
    //let res = await fetch("https://www.gasnow.org/api/v3/gas/price").then(data=>{return data.json()});
    //let gas = res.data.fast / (10 ** 9);
    //document.getElementById("gas price").innerHTML = "⛽ " + parseInt(gas);
}

async function updateAccountBalance() {
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // WORKAROUND: Using the wallet web3 to the balance
    // doesn't work well when the network is changed
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    let ethBalance = await web3min.eth.getBalance(selectedAccount);
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    ethBalance = web3.utils.fromWei(ethBalance, "ether");
    let balance = parseFloat(ethBalance).toFixed(6);
    document.getElementById("user balance").innerHTML = "💰 ETH: " + balance;
    console.log("Account", selectedAccount, "has", balance, "ETH")
}

async function updateNetworkConnection() {

    // Get a Web3 instance for the wallet
    web3 = new Web3(provider);
    console.log("Web3 instance is", web3);

    // Get connected chain id from Ethereum node
    let chainId = await web3.eth.getChainId();

    // Load chain information over an HTTP API
    let chainData = evmChains.getChain(chainId);
    walletNetwork = chainData.network.toLowerCase();

    let connectionIcon;
    let connectionToolTip;
    if (walletNetwork == network.toLowerCase()) {
        connectionIcon = "🟢";
        connectionToolTip = "Connected. You may interact with the loaded smart-contract."
        isWalletOnSameNetwork = true;
    }
    else {
        connectionIcon = "🟡";
        connectionToolTip = "Limited. Your wallet is connected to a different network."
        isWalletOnSameNetwork = false;
    }

    // Get list of accounts of the connected wallet
    let accounts = await web3.eth.getAccounts();
    console.log("Got accounts", accounts);
    web3.eth.defaultAccount = accounts[0];
    selectedAccount = web3.eth.defaultAccount;

    // Get the ETH balance on the selected account
    web3min = defaultWeb3(walletNetwork);
    updateAccountBalance(chainData.network);
    updateGasPrice();

    // Update connected account info
    document.getElementById("user account").title = connectionToolTip;
    document.getElementById("user account").innerHTML = connectionIcon + " " + selectedAccount;

}

function defaultWeb3(networkName) {
    console.log("Creating default web3 object. Network:", networkName)
    return new Web3(
        new Web3.providers.HttpProvider(
            //"https://data-seed-prebsc-1-s1.binance.org:8545/"
            "https://" + networkName.toLowerCase() + ".infura.io/v3/5be4fb52a8f9497dbbfef89b8a5c2cab"
        )
    );
}

function loadContract() {
    try {
        console.log("Loading contract at", address + "...");
        abi = loadedABI;
        contract = new web3.eth.Contract(abi, address);
        methods = {};
        for (const obj of loadedABI) {
            if (obj.type != "function") continue;
            methods[obj.name] = JSONCopy(obj);
        }
    }
    catch (e) {
        document.getElementById("content").srcdoc = e;
        return false;
    }
    document.getElementById("interaction console content").innerHTML = "";
    console.log("Success!");
    return true;
}

function getFunction(fnName, isReadOnly, ...args) {
    let fn = eval("contract.methods." + fnName)(...args);
    if (isReadOnly) return fn.call;
    return fn.send;
}

// Contract Read function
function read(fnName, callback, ...args) {
    return getFunction(fnName, true, ...args)(
        function(error, result) {
            if (error) {
                console.log(error);
                if (callback) callback(ERROR);
            }
            else {
                if (callback) callback(result);
                console.log(result);
            }
        }
    );
}

// Contract Write function
function write(fnName, callback, details, ...args) {
    return getFunction(fnName, false, ...args)(
        details,
        function(error, result) {
            if (error) {
                console.log(error);
                if (callback) callback(ERROR);
            }
            else {
                if (callback) callback(result);
                console.log(result);
            }
        }
    );
}

function send(amount, targetAccount, callback) {
    amountToSend = web3.utils.toWei(amount, "ether");
    web3.eth.sendTransaction(
        {
            from: selectedAccount,
            to: targetAccount, // CHANGE
            value: amountToSend
        },
        function(error, result) {
            if (error) {
                console.log("Alright, maybe next time... :)");
            }
            else {
                if (callback) callback(result);
                console.log("Thank you! Transaction:", result);
            }
        }
    );
}

function selectMethod() {
    selectedMethod = document.getElementById("methods").value;
    let method = methods[selectedMethod]; console.log("Selected:", method);
    let defaultText = "This method has no inputs.";
    let type = method.stateMutability;
    let executeBtn = document.getElementById("button execute");
    //executeBtn.innerHTML = "Execute " + type + " method";
    executeBtn.style.backgroundColor = methodTypeColor[type];
    addInputFields("interaction inputs content", method, defaultText);
}

function addDropDownMenu(container, name, text, values) {
    let select = document.createElement("select");
    select.name = name;
    select.id = name;
    select.style = "width: 217px; margin-left: 4px; border-radius: 5px; height:1.5em; border-width: 1px; font-size: 10pt"
    select.setAttribute('onchange', 'selectMethod();');
    for (const val of values) {
        let option = document.createElement("option");
        option.text = val;
        option.value = val;
        select.appendChild(option);
    }
    let btnId = text.toLowerCase();
    let button = document.createElement("button");
    button.id = "button " + btnId;
    button.style = "font-family: 'Open Sans'; font-size: 10pt; border-radius: 8px; height:1.5em; border-width: 1px; color: white"
    button.innerHTML = text + " ";
    button.setAttribute("onclick", btnId + "Click();");
    container.appendChild(button);
    container.appendChild(select);
}

function addInput(parentNode, name, placeholder, isArgument=true, innerHTML="") {
    let div   = document.createElement("div");
    let input = document.createElement("input");
    let label = document.createElement("label");
    let argID = (isArgument ? "arg " : "") + name;
    label.innerHTML = innerHTML || name + " ";
    label.htmlFor = name;
    label.style = "font-family: 'Open Sans'; font-size: 10pt;";
    input.name = name;
    input.id = argID;
    input.placeholder = placeholder;
    input.style = "font-family: 'Open Sans'; font-size: 10pt;";
    div.style = "text-align: right; padding: 0.2em;";
    parentNode.appendChild(div).appendChild(label).appendChild(input);
    if (isArgument) methodArguments.push(argID);

}

function addInputFields(container, method, defaultText) {
    let parentNode = document.getElementById(container);
    parentNode.innerHTML = "";
    methodArguments = [];
    if (method.stateMutability == "payable") {
        let innerHTML = "<strong style='color:red'>Send to contract&nbsp;</strong>";
        addInput(parentNode, "pay", "ether amount", isArgument=false, innerHTML=innerHTML);
    }
    else if (!method.inputs.length) {
        parentNode.innerHTML = defaultText;
        return;
    }
    for (const i of method.inputs) {
        addInput(parentNode, i.name || "param", i.type);
    }
}

function parseOutput(obj) {
    if (typeof(obj) == "object") {
        obj = JSONPretty(obj);
    }
    else {
        try {
            // Check if the output is in JSON format
            obj = JSONPretty(JSON.parse(obj));
        }
        catch (e) {
            // It's not JSON
        }
    }
    return obj;
}

function consoleWrite(content) {
    consoleArea.innerHTML += content + "<br/>";
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

function updateExecutionResult(result) {
    if (result == ERROR) {
        let msg = "<font color='Red'>Method execution error</font>";
        outputArea.innerHTML = msg;
        consoleArea.innerHTML += msg + "<br/>";
        consoleArea.scrollTop = consoleArea.scrollHeight;
        return;
    }

    let method = methods[selectedMethod];
    let consoleText = "";

    // It's a WRITE operation
    if (["view", "pure"].indexOf(method.stateMutability) < 0) {
        let link = etherscanAddress("tx", result);
        let text = "<strong>Check transaction result</strong>"
        outputArea.innerHTML = "<a href='" + link + "' target='_blank' class='interaction'>" + text + "</a>";
        consoleText = result + "<br/>"
    }
    // It's a READ operation
    else {
        let c1 = "<font color='Gray'>"
        let c2 = "<font color='Lime'>"
        let c3 = "<font color='Green'>"
        let ec = "</font>"
        let outputs = method.outputs;
        if (outputs.length > 1) {
            outputArea.innerHTML = "";
            for (k of Object.keys(result).sort()) {
                let type   = outputs[k].type;
                let output = parseOutput(result[k]);
                let index  = (outputs.length < 2) ? "" : k;
                let comma  = (k == outputs.length - 1) ? "" : ",";
                let endl   = (comma) ? "<br/>" : "";
                if (typeof(result[k]) != "object") output = '"' + output + '"';
                outputArea.innerHTML += output + comma + endl;
                consoleText += (
                    c1 + index + ": " + ec +
                    c2 + result[k] + ec +
                    c3 + " <i>" + type + "</i>" + ec + endl
                );
            }
        }
        else {
            let type   = method.outputs[0].type;
            let output = parseOutput(result);
            outputArea.innerHTML = output;
            consoleText += (
                c1 + "0: " + ec +
                c2 + output + ec +
                c3 + " <i>" + type + "</i>" + ec
            );
        }
    }

    consoleWrite(consoleText);
}

function sanitizedInputData(inputData, index) {
    let type = methods[selectedMethod].inputs[index].type;
    if (type.includes("[")) {
        let trimmedInputData = inputData.trim();
        if (trimmedInputData.startsWith("[") && trimmedInputData.endsWith("]")) {
            inputData = eval(inputData);
        }
        else {
            inputData = inputData.split(",");
            if (!type.includes("string")) {
                inputData = inputData.map(s => s.trim());
            }
        }
    }
    return inputData;
}

async function estimateGas(fnName, ...args) {
    let fn = eval("contract.methods." + fnName)(...args);
    return parseInt(await fn.estimateGas() * 1.5);
}

async function executeClick() {
    let method = methods[selectedMethod];
    let type = method.stateMutability;
    let args = [];

    for ([i, arg] of methodArguments.entries()) {
        let inputData = document.getElementById(arg).value;
        args.push(sanitizedInputData(inputData, i));
    }

    try {
        if (type == "pure" || type == "view") {
            read(selectedMethod, updateExecutionResult, ...args);
        }
        else {
            let transactionDetails = {
                from: selectedAccount
            };
            if (type == "payable") {
                let ethAmount = document.getElementById("pay").value;
                let weiAmount = web3.utils.toWei(ethAmount.toString());
                transactionDetails.value = weiAmount;
            }
            let gas = await estimateGas(selectedMethod, ...args);
            transactionDetails.gas = gas;
            console.log("Transaction details:", transactionDetails);
            write(selectedMethod, updateExecutionResult, transactionDetails, ...args);
        }
        let consoleText = (
            "Executing <font color=" + methodTypeColor[type] + ">" +
            type + "</font> method: <font color=Lime>" + selectedMethod +
            "(" + prettyArray(args) + ")</font>"
        );
        consoleWrite(consoleText);
    }
    catch (e) {
        if (String(e).startsWith("Error: invalid BigNumber string")) {
            msg = "Error: The input(s) cannot be empty";
            console.log(msg);
            consoleWrite("<font color=Yellow>" + msg + "</font>");
        }
    }

}

async function interact() {
    //network = "ropsten";
    //address = "0xC66c66B3982F19aC6619695aa17d44A141055Fe6";
    network = "chapel";
    address = "0xD7A10E3f2Cb8910430B13d1b4A906f74864f6DAD";


    // apiNetwork = network == "mainnet" ? "" : "-" + network;
    // abiURL = "https://api" + apiNetwork + ".etherscan.io/api?module=contract&action=getabi&address=" + address;
    // loadedABI = JSON.parse(JSON.parse(await fetch(abiURL).then(response => response.text())).result);

    abiURL = "abi.json";
    loadedABI = await fetch(abiURL).then(response => response.json());
    loadContract();

    if (contract && loadedABI) {
        let values = Object.keys(methods);
        let container = document.getElementById("interaction method");
        container.style.textAlign = "right";
        container.innerHTML = "";
        addDropDownMenu(container, "methods", "Execute", values);
        selectMethod();
    }
    else {
        document.getElementById("interaction header").innerHTML = "Click here to load an ABI for this contract."
    }

    if (walletNetwork != network) {
        consoleWrite("<font color=Yellow>Warning:</font> Your wallet is connected to a different network.")
    }
    consoleWrite("Loaded contract: <font color=Lime>" + address + "</font>");
}

function etherscanAddress(type, id) {
    let etherscanNetwork = network.toLowerCase() == "mainnet" ? "" : network.toLowerCase() + ".";
    return "https://" + etherscanNetwork + "etherscan.io/" + type + "/" + id;
}

function setTransactionsURL() {
    document.getElementById("transactions url").href = etherscanAddress("address", selectedAccount);
}

function donate() {
    send("0.01", donationAccount, donationSuccess);
}

function donationSuccess(tx) {
    alert("Thank you! Click transactions to see the progress of your donation.");
}

async function main() {
    // Setup wallet connection
    isWalletConnected = false;
    web3Modal = new Web3Modal.default({
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false // optional. For MetaMask / Brave / Opera.
    });

    // Create Web3 instance and connect to the given network
    web3min = defaultWeb3(network);
    web3 = web3min;

    document.getElementById("content").src = "main.html";

    // Update user balance every 15 seconds
    var interval = setInterval(
        function () {
            if (isWalletConnected && document.hasFocus()) {
                updateAccountBalance();
                updateGasPrice();
            }
        }, 15000
    );

    document.addEventListener('click', function (e) {
        e = e || window.event;
        var target = e.target || e.srcElement;

        if (target.hasAttribute('data-toggle') && target.getAttribute('data-toggle') == 'modal') {
            if (target.hasAttribute('data-target')) {
                var m_ID = target.getAttribute('data-target');
                document.getElementById(m_ID).classList.add('open');
                e.preventDefault();
            }
        }

        // Close modal window with 'data-dismiss' attribute or when the backdrop is clicked
        if ((target.hasAttribute('data-dismiss') && target.getAttribute('data-dismiss') == 'modal') || target.classList.contains('modal')) {
            var modal = document.querySelector('[class="modal open"]');
            modal.classList.remove('open');
            e.preventDefault();
        }
    }, false);

    outputArea = document.getElementById("interaction outputs content");
    consoleArea = document.getElementById("interaction console content");
}
