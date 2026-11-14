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
    const accountId = $("loginId").value.trim();
    const pin = $("loginPin").value;
    if (accountId === SHARED_LOGIN_ID && pin === SHARED_LOGIN_PIN) {
      sessionStorage.setItem("monopoly-bank-demo-auth", "signed-in");
      $("loginError").textContent = "";
      $("loginScreen").classList.add("hidden");
      $("appShell").classList.remove("app-locked");
    } else {
      $("loginError").textContent = "The account ID or PIN is incorrect.";
    }
  });
  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("monopoly-bank-demo-auth");
    $("appShell").classList.add("app-locked");
    $("loginScreen").classList.remove("hidden");
    $("loginPin").value = "";
  });
  if (sessionStorage.getItem("monopoly-bank-demo-auth") === "signed-in") {
    $("loginScreen").classList.add("hidden");
    $("appShell").classList.remove("app-locked");
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.customers) && Array.isArray(saved.transactions) && Number.isFinite(saved.bank)) {
        if (!saved.customers.some(p => p.name.toLowerCase() === "mia marie james")) {
          saved.customers.push({id:"MB-MIA001",name:"Mia Marie James",balance:500000});
          if (saved.bank >= 500000) saved.bank -= 500000;
          saved.transactions.unshift({id:"MB-DEMO01",type:"account",amount:500000,description:"Demo starting balance",customer:"Mia Marie James",other:"",at:new Date().toISOString()});
        }
        return saved;
      }
    } catch (_) {}
    return {bank:STARTING_BANK-500000,customers:[{id:"MB-MIA001",name:"Mia Marie James",balance:500000}],transactions:[{id:"MB-DEMO01",type:"account",amount:500000,description:"Demo starting balance",customer:"Mia Marie James",other:"",at:new Date().toISOString()}]};
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); render(); }
  function id() { return "MB-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
  function customerById(value) { return state.customers.find(p => p.id === value); }
  function log(type, amount, description, customer, other) {
    state.transactions.unshift({id:id(),type,amount,description,customer:customer || "Bank",other:other || "",at:new Date().toISOString()});
    state.transactions = state.transactions.slice(0,300);
  }
  function render() {
    $("bankTotal").textContent = money(state.bank);
    $("customerCount").textContent = state.customers.length;
    $("customerTotal").textContent = money(state.customers.reduce((sum,p)=>sum+p.balance,0));
    $("transactionCount").textContent = state.transactions.length;
    $("customersList").innerHTML = state.customers.map(p => `
      <div class="customer-row">
        <div class="avatar">${safeText(p.name.trim().charAt(0).toUpperCase())}</div>
        <div class="customer-info"><strong>${safeText(p.name)}</strong><small>Account ID: ${DISPLAY_ACCOUNT_ID}</small></div>
        <div class="customer-balance">${money(p.balance)}</div>
        <div class="customer-actions"><button class="icon-button" data-action="pay" data-id="${p.id}" title="Make a payment to this account">Pay</button><button class="icon-button" data-action="remove" data-id="${p.id}" title="Remove customer">×</button></div>
      </div>`).join("");
    $("emptyCustomers").classList.toggle("hidden",state.customers.length>0);
    $("customersList").classList.toggle("hidden",state.customers.length===0);
    const opts = state.customers.map(p=>`<option value="${p.id}">${safeText(p.name)} — ${money(p.balance)}</option>`).join("");
    $("txFrom").innerHTML = opts || '<option value="">Add a customer account first</option>';
    $("txTo").innerHTML = opts || '<option value="">Add a customer first</option>';
    const rows = state.transactions.slice(0,20);
    $("historyBody").innerHTML = rows.map(t=>{
      const positive = t.type === "deposit" || t.type === "transfer-in";
      const label = ({deposit:"Bank payment",withdraw:"Paid to bank",transfer:"Account transfer", "transfer-in":"Transfer received", "account":"Account opened"})[t.type] || t.type;
      return `<tr><td class="tx-type">${label}<br><span class="tx-date">${safeText(t.description || "")}</span></td><td>${safeText(t.customer)}${t.other ? " → "+safeText(t.other) : ""}</td><td class="${positive?"positive":"negative"}">${positive?"+":"−"}${money(t.amount)}</td><td class="tx-date">${new Date(t.at).toLocaleString()}</td></tr>`;
    }).join("");
    $("emptyHistory").classList.toggle("hidden",rows.length>0);
  }
  function openCustomerDialog() { $("customerError").textContent=""; $("customerName").value=""; $("startingBalance").value="500000"; $("customerDialog").showModal(); $("customerName").focus(); }
  ["newCustomer","newCustomerTop","emptyAdd"].forEach(id=>$ (id).addEventListener("click",openCustomerDialog));
  $("closeCustomer").addEventListener("click",()=>$("customerDialog").close());
  $("customerForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("customerName").value.trim(), balance=Number($("startingBalance").value);
    if(!name){$("customerError").textContent="Enter a customer name.";return;}
    if(!Number.isSafeInteger(balance)||balance<0){$("customerError").textContent="Enter a valid starting balance.";return;}
    if(state.customers.some(p=>p.name.toLowerCase()===name.toLowerCase())){$("customerError").textContent="That customer already has an account.";return;}
    if(balance>state.bank){$("customerError").textContent="The bank does not have enough funds.";return;}
    const customer={id:id(),name,balance};
    state.customers.push(customer);state.bank-=balance;log("account",balance,"Starting balance",name);$("customerDialog").close();save();
  });
  function updateTransactionMode(){const transfer=$("txType").value==="transfer";$("toGroup").classList.toggle("hidden",!transfer);$("fromLabel").textContent=transfer?"From customer": "Customer";}
  $("txType").addEventListener("change",updateTransactionMode);
  $("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();const type=$("txType").value,from=customerById($("txFrom").value),amount=Number($("txAmount").value),note=$("txNote").value.trim();
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
      const to=customerById($("txTo").value);
      if(!to||to.id===from.id){msg.textContent="Choose a different customer to receive the transfer.";return;}
      if(amount>from.balance){msg.textContent="This customer does not have enough money.";return;}
      from.balance-=amount;to.balance+=amount;log("transfer",amount,note||"Customer transfer",from.name,to.name);log("transfer-in",amount,note||"Customer transfer",to.name,from.name);
    }
    $("txAmount").value="";$("txNote").value="";save();msg.textContent="Transaction recorded successfully.";
  });
  $("customersList").addEventListener("click",e=>{
    const btn=e.target.closest("button[data-action]");if(!btn)return;
    const p=customerById(btn.dataset.id);if(!p)return;
    if(btn.dataset.action==="pay"){$("txType").value="deposit";updateTransactionMode();$("txFrom").value=p.id;$("txAmount").focus();$("transactionForm").scrollIntoView({behavior:"smooth",block:"center"});}
    if(btn.dataset.action==="remove")ask("Close customer account?",`Close ${p.name}’s account? Their remaining balance will return to the bank. This cannot be undone.`,()=>{
      state.bank+=p.balance;state.customers=state.customers.filter(x=>x.id!==p.id);log("withdraw",p.balance,"Account closed",p.name);save();
    });
  });
  function ask(title,description,action){$("confirmTitle").textContent=title;$("confirmText").textContent=description;confirmAction=action;$("confirmDialog").showModal();}
  $("confirmYes").addEventListener("click",e=>{e.preventDefault();$("confirmDialog").close();if(confirmAction)confirmAction();confirmAction=null;});
  $("clearHistory").addEventListener("click",()=>{if(!state.transactions.length)return;ask("Clear transaction history?","This only clears the ledger. Customer balances will not change.",()=>{state.transactions=[];save();});});
  $("resetSystem").addEventListener("click",()=>ask("Reset all account records?","All customer accounts and transaction history will be reset.",()=>{state={bank:STARTING_BANK-500000,customers:[{id:"MB-MIA001",name:"Mia Marie James",balance:500000}],transactions:[{id:"MB-DEMO01",type:"account",amount:500000,description:"Demo starting balance",customer:"Mia Marie James",other:"",at:new Date().toISOString()}]};save();}));
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({app:"Monopoly Bank Account Portal",exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="monopoly-bank-backup.json";a.click();URL.revokeObjectURL(url);
  });
  updateTransactionMode();render();
})();