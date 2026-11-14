(() => {
  "use strict";
  const KEY = "monopoly-bank-state-v1";
  const STARTING_BANK = 120000000;
  const SHARED_LOGIN_ID = "482731905614";
  const SHARED_LOGIN_PIN = "071999";
  const DISPLAY_ACCOUNT_ID = SHARED_LOGIN_ID;
  const $ = (id) => document.getElementById(id);
  const money = (amount) => "$" + Number(amount || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
  const safeText = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let state = load();
  let confirmAction = null;

  const loginForm = $("loginForm");
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const accountId = $("loginId").value.replace(/\s/g, "");
    const pin = $("loginPin").value.trim();
    if (accountId === SHARED_LOGIN_ID && pin === SHARED_LOGIN_PIN) {
      sessionStorage.setItem("monopoly-bank-auth", "signed-in");
      $("loginError").textContent = "";
      $("loginScreen").classList.add("hidden");
      $("appShell").classList.remove("app-locked");
      render();
    } else {
      $("loginError").textContent = "The account ID or PIN is incorrect.";
    }
  });
  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("monopoly-bank-auth");
    $("appShell").classList.add("app-locked");
    $("loginScreen").classList.remove("hidden");
    $("loginPin").value = "";
  });
  if (sessionStorage.getItem("monopoly-bank-auth") === "signed-in") {
    $("loginScreen").classList.add("hidden");
    $("appShell").classList.remove("app-locked");
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.players) && Array.isArray(saved.transactions) && Number.isFinite(saved.bank)) {
        saved.transactions = saved.transactions.map(t => ({...t, id: t.id === "MB-DEMO01" ? "MB-OPEN001" : t.id, description: t.description === "Demo starting balance" ? "Opening balance" : t.description}));
        if (!saved.players.some(p => p.name.toLowerCase() === "mia marie james")) {
          saved.players.push({id:"MB-MIA001",name:"Mia Marie James",balance:500000});
          if (saved.bank >= 500000) saved.bank -= 500000;
          saved.transactions.unshift({id:"MB-OPEN001",type:"account",amount:500000,description:"Opening balance",player:"Mia Marie James",other:"",at:new Date().toISOString()});
        }
        return saved;
      }
    } catch (_) {}
    return {bank:STARTING_BANK-500000,players:[{id:"MB-MIA001",name:"Mia Marie James",balance:500000}],transactions:[{id:"MB-OPEN001",type:"account",amount:500000,description:"Opening balance",player:"Mia Marie James",other:"",at:new Date().toISOString()}]};
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); render(); }
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
    $("txTo").innerHTML = opts;
    if (signedInAccount) $("txFrom").value = signedInAccount.id;
    const rows = state.transactions.filter(t => t.player === "Mia Marie James" || t.other === "Mia Marie James").slice(0,20);
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
  function updateTransactionMode(){const transfer=$("txType").value==="transfer";$("toGroup").classList.toggle("hidden",!transfer);$("fromLabel").textContent=transfer?"From account": "Customer account";}
  $("txType").addEventListener("change",updateTransactionMode);
  $("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();const type=$("txType").value,from=playerById($("txFrom").value),amount=Number($("txAmount").value),note=$("txNote").value.trim();
    const msg=$("formMessage");msg.textContent="";
    if(!from){msg.textContent="Create a customer account first.";return;}
    if(!Number.isSafeInteger(amount)||amount<=0){msg.textContent="Enter a whole-number amount greater than zero.";return;}
    if(type==="deposit"){
      if(amount>state.bank){msg.textContent="The bank does not have enough funds.";return;}
      state.bank-=amount;from.balance+=amount;log("deposit",amount,note||"Bank payment",from.name);
    }else if(type==="withdraw"){
      if(amount>from.balance){msg.textContent="This account does not have enough funds.";return;}
      from.balance-=amount;state.bank+=amount;log("withdraw",amount,note||"Paid to bank",from.name);
    }else{
      const to=playerById($("txTo").value);
      if(!to||to.id===from.id){msg.textContent="Choose a different account to receive the transfer.";return;}
      if(amount>from.balance){msg.textContent="This account does not have enough funds.";return;}
      from.balance-=amount;to.balance+=amount;log("transfer",amount,note||"Account transfer",from.name,to.name);log("transfer-in",amount,note||"Account transfer",to.name,from.name);
    }
    $("txAmount").value="";$("txNote").value="";save();msg.textContent="Transaction recorded successfully.";
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
  $("resetGame").addEventListener("click",()=>ask("Reset all account records?","All customer accounts and transaction history will be reset.",()=>{state={bank:STARTING_BANK-500000,players:[{id:"MB-MIA001",name:"Mia Marie James",balance:500000}],transactions:[{id:"MB-OPEN001",type:"account",amount:500000,description:"Opening balance",player:"Mia Marie James",other:"",at:new Date().toISOString()}]};save();}));
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({app:"Monopoly Bank Account Portal",exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="monopoly-bank-backup.json";a.click();URL.revokeObjectURL(url);
  });
  const themeButton = $("themeBtn");
  const savedTheme = localStorage.getItem("monopoly-bank-theme");
  if (savedTheme === "light") document.body.classList.add("light-mode");
  function updateThemeButton() {
    const light = document.body.classList.contains("light-mode");
    themeButton.textContent = light ? "☾ Dark mode" : "☀ Light mode";
    themeButton.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  }
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("monopoly-bank-theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    updateThemeButton();
  });
  updateThemeButton();
  updateTransactionMode();render();
})();