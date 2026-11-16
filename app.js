(() => {
  "use strict";
  const KEY = "monopoly-bank-state-v1";
  const AUTH_KEY = "monopoly-bank-demo-auth";
  const THEME_KEY = "monopoly-bank-theme";
  const STARTING_BANK = 120000000;
  const API_URL = "https://jzzfgvokewysinfvjtkx.supabase.co/functions/v1/monopoly-bank";
  const API_KEY = "sb_publishable_U3RSQ6gP5Fer2TBOV2LOvA_UAK1Lnc3";
  const DISPLAY_ACCOUNT_ID = "482731905614";
  const $ = (id) => document.getElementById(id);
  const money = (amount) => "$" + Number(amount || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
  const safeText = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const readStorage = (storage, key) => { try { return storage.getItem(key); } catch (_) { return null; } };
  const writeStorage = (storage, key, value) => { try { storage.setItem(key, value); } catch (_) {} };
  const removeStorage = (storage, key) => { try { storage.removeItem(key); } catch (_) {} };
  let state = load();
  let confirmAction = null;

  const loginForm = $("loginForm");
  function showDashboard() {
    $("loginScreen").classList.add("hidden");
    $("appShell").classList.remove("app-locked");
    render();
  }
  async function bankApi(payload) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": API_KEY },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The server could not complete the request.");
    return result;
  }
  async function signIn(event) {
    if (event) event.preventDefault();
    const accountId = $("loginId").value.replace(/\s/g, "");
    const pin = $("loginPin").value.trim();
    const error = $("loginError");
    const button = $("loginButton");
    if (!/^\d{12}$/.test(accountId) || !/^\d{6}$/.test(pin)) {
      error.textContent = "Enter a 12-digit account ID and a 6-digit PIN.";
      return;
    }
    button.disabled = true;
    error.textContent = "Checking account…";
    try {
      const result = await bankApi({ action: "get", loginId: accountId, loginPin: pin });
      state = result.state || { bank: STARTING_BANK-500000, players:[{id:"MB-MIA001",name:"Mia Marie James",balance:484567.88}], transactions:sampleLedger(), sampleLedgerVersion:4 };
      writeStorage(sessionStorage, AUTH_KEY, "signed-in");
      error.textContent = "";
      showDashboard();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  }
  $("loginButton").addEventListener("click", signIn);
  loginForm.addEventListener("submit", signIn);
  $("logoutBtn").addEventListener("click", () => {
    removeStorage(sessionStorage, AUTH_KEY);
    $("appShell").classList.add("app-locked");
    $("loginScreen").classList.remove("hidden");
    $("loginPin").value = "";
  });
  if (readStorage(sessionStorage, AUTH_KEY) === "signed-in") {
    removeStorage(sessionStorage, AUTH_KEY);
  }

  function sampleLedger() {
    return [
      {id:"MB-OPEN01",type:"account",amount:500000,description:"Initial deposit · sample record",player:"Mia Marie James",other:"",at:"2026-11-01T09:15:00.000Z"},
      {id:"MB-TX1001",type:"withdraw",amount:4500,description:"Sample transfer to external account",player:"Mia Marie James",other:"",at:"2026-11-03T11:40:00.000Z"},
      {id:"MB-TX1002",type:"withdraw",amount:2750,description:"Sample household utility payment",player:"Mia Marie James",other:"",at:"2026-11-06T08:25:00.000Z"},
      {id:"MB-TX1003",type:"withdraw",amount:1200,description:"Sample mobile and internet payment",player:"Mia Marie James",other:"",at:"2026-11-08T16:10:00.000Z"},
      {id:"MB-TX1004",type:"withdraw",amount:3482.12,description:"Sample retail card purchase",player:"Mia Marie James",other:"",at:"2026-11-11T13:05:00.000Z"},
      {id:"MB-TX1005",type:"withdraw",amount:3500,description:"Sample cash withdrawal",player:"Mia Marie James",other:"",at:"2026-11-14T10:30:00.000Z"}
    ];
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.players) && Array.isArray(saved.transactions) && Number.isFinite(saved.bank)) {
        let account = saved.players.find(p => p.name.toLowerCase() === "mia marie james");
        if (!account) {
          account = {id:"MB-MIA001",name:"Mia Marie James",balance:484567.88};
          saved.players.push(account);
        }
        const sampleIds = new Set(sampleLedger().map(t => t.id));
        const hasSampleLedger = sampleLedger().every(sample => saved.transactions.some(t => t.id === sample.id));
        if (saved.sampleLedgerVersion !== 4 || !hasSampleLedger) {
          const nonSampleEntries = saved.transactions.filter(t => !sampleIds.has(t.id));
          saved.transactions = [...sampleLedger(), ...nonSampleEntries];
          saved.sampleLedgerVersion = 4;
        }
        return saved;
      }
    } catch (_) {}
    return {bank:STARTING_BANK-500000,players:[{id:"MB-MIA001",name:"Mia Marie James",balance:484567.88}],transactions:sampleLedger(),sampleLedgerVersion:4};
  }
  async function save(transactionPin) {
    render();
    if (!transactionPin) {
      $("formMessage").textContent = "This management change is local only. Use a PIN-confirmed transaction to save shared account data.";
      return;
    }
    try {
      await bankApi({ action:"save", loginId:$("loginId").value.replace(/\s/g,""), loginPin:$("loginPin").value.trim(), transactionPin, state });
      $("formMessage").textContent = "Saved to the shared Supabase account.";
    } catch (err) {
      $("formMessage").textContent = "Cloud save failed: " + err.message;
    }
  }
  function id() { return "MB-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
  function playerById(value) { return state.players.find(p => p.id === value); }
  function log(type, amount, description, player, other) {
    state.transactions.unshift({id:id(),type,amount,description,player:player || "Bank",other:other || "",at:new Date().toISOString()});
    state.transactions = state.transactions.slice(0,300);
  }
  function render() {
    const signedInAccount = state.players.find(p => p.name.toLowerCase() === "mia marie james") || state.players[0];
    $("accountBalance").textContent = money(signedInAccount ? signedInAccount.balance : 0);
    $("playersList").innerHTML = state.players.map(p => `
      <div class="player-row">
        <div class="avatar">${safeText(p.name.trim().charAt(0).toUpperCase())}</div>
        <div class="player-info"><strong>${safeText(p.name)}</strong><small>Account ID: ${DISPLAY_ACCOUNT_ID}</small></div>
        <div class="player-balance">${money(p.balance)}</div>
        <div class="player-actions"><button class="icon-button" data-action="pay" data-id="${p.id}" title="Make a payment to this account">Pay</button><button class="icon-button" data-action="remove" data-id="${p.id}" title="Close account">×</button></div>
      </div>`).join("");
    $("emptyPlayers").classList.toggle("hidden",state.players.length>0);
    $("playersList").classList.toggle("hidden",state.players.length===0);
    const opts = signedInAccount ? `<option value="${signedInAccount.id}">${safeText(signedInAccount.name)}</option>` : '<option value="">Account unavailable</option>';
    $("txFrom").innerHTML = opts;
    if (signedInAccount) $("txFrom").value = signedInAccount.id;
    const rows = state.transactions.filter(t => t.player === "Mia Marie James" || t.other === "Mia Marie James").sort((a,b) => new Date(a.at) - new Date(b.at)).slice(0,20);
    $("historyBody").innerHTML = rows.map(t=>{
      const positive = t.type === "deposit" || t.type === "transfer-in" || t.type === "account";
      const label = ({deposit:"Deposit",withdraw:"Withdrawal",transfer:"Account transfer", "transfer-in":"Transfer received", "account":"Account opened"})[t.type] || t.type;
      return `<tr><td class="tx-type">${label}<span class="tx-date">${safeText(t.description || "")}</span></td><td class="${positive?"positive":"negative"}">${positive?"+":"−"}${money(t.amount)}</td><td class="tx-date">${new Date(t.at).toLocaleString()}</td></tr>`;
    }).join("");
    $("emptyHistory").classList.toggle("hidden",rows.length>0);
  }
  function openPlayerDialog() { $("playerError").textContent=""; $("playerName").value=""; $("startingBalance").value="500000"; $("playerDialog").showModal(); $("playerName").focus(); }
  ["newPlayer","emptyAdd"].forEach(id=>{const button=$(id);if(button)button.addEventListener("click",openPlayerDialog);});
  $("closePlayer").addEventListener("click",()=>$("playerDialog").close());
  $("playerForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("playerName").value.trim(), balance=Number($("startingBalance").value);
    if(!name){$("playerError").textContent="Enter a customer name.";return;}
    if(!Number.isSafeInteger(balance)||balance<0){$("playerError").textContent="Enter a valid starting balance.";return;}
    if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){$("playerError").textContent="That customer already has an account.";return;}
    if(balance>state.bank){$("playerError").textContent="The bank does not have enough funds.";return;}
    const player={id:id(),name,balance};
    state.players.push(player);state.bank-=balance;log("account",balance,"Starting balance",name);$("playerDialog").close();save();
  });
  function updateTransactionMode(){const transfer=$("txType").value==="transfer";$("toGroup").classList.toggle("hidden",!transfer);$("fromLabel").textContent=transfer?"From account": "Customer account";$("recipientName").required=transfer;}
  $("txType").addEventListener("change",updateTransactionMode);
  let pendingTransaction = null;
  function applyPendingTransaction(transactionPin) {
    if (!pendingTransaction) return;
    const {type,fromId,amount,note,recipient} = pendingTransaction;
    const from = playerById(fromId);
    const msg = $("formMessage");
    if (!from) { msg.textContent = "Account unavailable. No changes were made."; pendingTransaction=null; return; }
    if (type === "deposit") {
      if (amount > state.bank) { msg.textContent = "The bank does not have enough funds."; pendingTransaction=null; return; }
      state.bank -= amount; from.balance += amount; log("deposit",amount,note||"Sample deposit",from.name);
    } else if (type === "withdraw") {
      if (amount > from.balance) { msg.textContent = "This account does not have enough funds."; pendingTransaction=null; return; }
      from.balance -= amount; state.bank += amount; log("withdraw",amount,note||"Sample withdrawal",from.name);
    } else {
      if (amount > from.balance) { msg.textContent = "This account does not have enough funds."; pendingTransaction=null; return; }
      from.balance -= amount; log("transfer",amount,note||"Sample transfer to "+recipient,from.name,recipient);
    }
    pendingTransaction = null;
    $("txAmount").value=""; $("txNote").value=""; $("recipientName").value="";
    $("transactionPin").value="";
    $("transactionPinDialog").close();
    save(transactionPin);
  }
  $("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();
    const type=$("txType").value,from=playerById($("txFrom").value),amount=Number($("txAmount").value),note=$("txNote").value.trim();
    const msg=$("formMessage");msg.textContent="";
    if(!from){msg.textContent="Account unavailable.";return;}
    if(!Number.isSafeInteger(amount)||amount<=0){msg.textContent="Enter a whole-number amount greater than zero.";return;}
    const recipient=$("recipientName").value.trim();
    if(type==="transfer"&&!recipient){msg.textContent="Enter the recipient name or account reference.";return;}
    if(type==="deposit"&&amount>state.bank){msg.textContent="The bank does not have enough funds.";return;}
    if(type!=="deposit"&&amount>from.balance){msg.textContent="This account does not have enough funds.";return;}
    pendingTransaction={type,fromId:from.id,amount,note,recipient};
    $("transactionPin").value="";
    $("transactionPinError").textContent="";
    $("transactionPinDialog").showModal();
    $("transactionPin").focus();
  });
  $("cancelTransactionPin").addEventListener("click",()=>{pendingTransaction=null;$("transactionPin").value="";$("transactionPinDialog").close();$("formMessage").textContent="Transaction cancelled.";});
  $("confirmTransactionPin").addEventListener("click",e=>{
    e.preventDefault();
    const transactionPin = $("transactionPin").value;
    applyPendingTransaction(transactionPin);
  });
  $("playersList").addEventListener("click",e=>{
    const btn=e.target.closest("button[data-action]");if(!btn)return;
    const p=playerById(btn.dataset.id);if(!p)return;
    if(btn.dataset.action==="pay"){$("txType").value="deposit";updateTransactionMode();$("txFrom").value=p.id;$("txAmount").focus();$("transactionForm").scrollIntoView({behavior:"smooth",block:"center"});}
    if(btn.dataset.action==="remove")ask("Close customer account?",`Close ${p.name}’s account? Their remaining balance will return to the bank. This cannot be undone.`,()=>{
      state.bank+=p.balance;state.players=state.players.filter(x=>x.id!==p.id);log("withdraw",p.balance,"Account closed",p.name);save();
    });
  });
  function ask(title,description,action){$("confirmTitle").textContent=title;$("confirmText").textContent=description;confirmAction=action;$("confirmDialog").showModal();}
  $("confirmYes").addEventListener("click",e=>{e.preventDefault();$("confirmDialog").close();if(confirmAction)confirmAction();confirmAction=null;});
  $("clearHistory").addEventListener("click",()=>{if(!state.transactions.length)return;ask("Clear transaction history?","This only clears the ledger. Account balances will not change.",()=>{state.transactions=[];save();});});
  $("resetGame").addEventListener("click",()=>ask("Reset all account records?","All customer accounts and transaction history will be reset.",()=>{state={bank:STARTING_BANK-500000,players:[{id:"MB-MIA001",name:"Mia Marie James",balance:500000}],transactions:[]};save();}));
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({app:"Monopoly Bank Account Portal",exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="monopoly-bank-backup.json";a.click();URL.revokeObjectURL(url);
  });
  const themeButton = $("themeBtn");
  const savedTheme = readStorage(localStorage, THEME_KEY);
  if (savedTheme !== "dark") document.body.classList.add("light-mode");
  function updateThemeButton() {
    const light = document.body.classList.contains("light-mode");
    themeButton.textContent = light ? "☾ Dark mode" : "☀ Light mode";
    themeButton.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  }
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    writeStorage(localStorage, THEME_KEY, document.body.classList.contains("light-mode") ? "light" : "dark");
    updateThemeButton();
  });
  updateThemeButton();
  updateTransactionMode();render();
})();
