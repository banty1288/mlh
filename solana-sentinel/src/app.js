import { validateSolanaAddress, sumLamportDelta } from './utils.js';
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const MODEL_FALLBACK = 'gemini-3.8-flash';
const $ = (id) => document.getElementById(id);
let currentReport = null;
let toastTimer = null;

const PROGRAMS = new Map([
  ['11111111111111111111111111111111', 'System Program'],
  [TOKEN_PROGRAM, 'SPL Token Program'],
  [TOKEN_2022_PROGRAM, 'Token-2022 Program'],
  ['ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', 'Associated Token Program'],
  ['ComputeBudget111111111111111111111111111111', 'Compute Budget'],
  ['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'Memo Program'],
  ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', 'Jupiter v6'],
  ['JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', 'Jupiter v4'],
]);

function showStatus(message, kind = '') {
  const node = $('status');
  node.className = `status ${kind}`.trim();
  node.replaceChildren();
  const dot = document.createElement('span'); dot.className = 'status-dot';
  const text = document.createElement('span'); text.textContent = message;
  node.append(dot, text);
}
function toast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}
function shortAddress(value, left = 8, right = 6) {
  return value && value.length > left + right + 1 ? `${value.slice(0, left)}…${value.slice(-right)}` : (value || '—');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function formatNumber(value, max = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {maximumFractionDigits:max}).format(n);
}
function formatTime(unix) {
  if (!unix) return 'Time unavailable';
  return new Date(unix * 1000).toLocaleString(undefined, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
async function rpc(method, params, endpoint = DEFAULT_RPC) {
  const response = await fetch(endpoint, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params}),
    signal:AbortSignal.timeout(18000)
  });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}. Try again or use a dedicated RPC endpoint.`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || `RPC error in ${method}`);
  return payload.result;
}
function accountKeyText(key) { return typeof key === 'string' ? key : key?.pubkey || ''; }
function flattenInstructions(tx) {
  const top = tx?.transaction?.message?.instructions || [];
  const inner = (tx?.meta?.innerInstructions || []).flatMap(group => group.instructions || []);
  return [...top, ...inner];
}
function parseInstructionEvents(tx) {
  const events = [];
  for (const ix of flattenInstructions(tx)) {
    const p = ix?.parsed;
    if (!p || typeof p !== 'object') continue;
    const type = String(p.type || '').toLowerCase();
    const info = p.info || {};
    if (type === 'transfer' && (info.lamports !== undefined || info.amount !== undefined)) {
      const lamports = Number(info.lamports || 0);
      events.push({kind: info.lamports !== undefined ? 'SOL transfer' : 'Token transfer', source:info.source || '', destination:info.destination || '', amount:info.lamports !== undefined ? lamports / 1e9 : Number(info.amount || 0), unit:info.lamports !== undefined ? 'SOL (lamports)' : 'raw token units'});
    } else if (type === 'transferchecked') {
      const token = info.tokenAmount || {};
      events.push({kind:'Checked token transfer',source:info.source || '',destination:info.destination || '',mint:info.mint || '',amount:token.uiAmountString ?? token.amount ?? 'unknown',unit:`token (decimals ${token.decimals ?? '?'})`});
    } else if (['mintto','burn','closeaccount','initializeaccount','approve'].includes(type)) {
      const labels = {mintto:'Mint to',burn:'Burn',closeaccount:'Close account',initializeaccount:'Initialize account',approve:'Approve'};
      events.push({kind:labels[type],mint:info.mint || '',account:info.account || info.accountOwner || '',amount:info.amount || ''});
    }
  }
  return events.slice(0, 8);
}
function tokenDeltaForWallet(tx, wallet) {
  const aggregate = new Map();
  const add = (entry, sign) => {
    if (!entry) return;
    // accountIndex points to the token account, not the wallet's system account.
    // Only attribute token deltas when the RPC explicitly includes the wallet owner.
    const ownerMatch = entry.owner === wallet;
    if (!ownerMatch) return;
    const mint = entry.mint || 'Unknown mint';
    const amount = Number(entry.uiTokenAmount?.uiAmountString ?? entry.uiTokenAmount?.uiAmount ?? 0);
    const old = aggregate.get(mint) || {mint, amount:0, decimals:entry.uiTokenAmount?.decimals ?? 0};
    old.amount += sign * (Number.isFinite(amount) ? amount : 0);
    aggregate.set(mint, old);
  };
  for (const entry of tx?.meta?.preTokenBalances || []) add(entry, -1);
  for (const entry of tx?.meta?.postTokenBalances || []) add(entry, 1);
  return [...aggregate.values()].filter(x => Math.abs(x.amount) > 0.0000000001).map(x => ({...x, amount: Number(x.amount.toFixed(Math.min(x.decimals, 10)))}));
}
function summarizeTransaction(signatureInfo, tx, wallet) {
  const message = tx?.transaction?.message;
  const keys = message?.accountKeys || [];
  const index = keys.findIndex(k => accountKeyText(k) === wallet);
  const lamportDelta = index >= 0 ? sumLamportDelta(tx?.meta?.preBalances, tx?.meta?.postBalances, index) : null;
  const solDelta = lamportDelta === null ? null : lamportDelta / 1e9;
  const ids = new Set(flattenInstructions(tx).map(ix => ix.programId || ix.program || '').filter(Boolean));
  return {
    signature:signatureInfo.signature, blockTime:tx?.blockTime || signatureInfo.blockTime || null,
    success:!signatureInfo.err && !tx?.meta?.err, error:signatureInfo.err || tx?.meta?.err || null,
    feeSol:Number(tx?.meta?.fee || 0) / 1e9, solDelta,
    programs:[...ids].map(id => ({id,label:PROGRAMS.get(id) || 'Unlabelled program'})),
    tokenDeltas:tokenDeltaForWallet(tx, wallet), events:parseInstructionEvents(tx),
    slot:tx?.slot ?? signatureInfo.slot ?? null
  };
}
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length); let cursor = 0;
  const runners = Array.from({length:Math.min(limit, items.length)}, async () => {
    while (cursor < items.length) { const index = cursor++; try { results[index] = await worker(items[index], index); } catch (error) { results[index] = {fetchError:error.message}; } }
  });
  await Promise.all(runners); return results;
}
async function fetchWallet(address, limit, endpoint) {
  showStatus('Fetching SOL balance, token accounts and recent signatures…','loading');
  const [balance, tokenClassic, token2022, signatures] = await Promise.all([
    rpc('getBalance',[address,{commitment:'confirmed'}],endpoint),
    rpc('getTokenAccountsByOwner',[address,{programId:TOKEN_PROGRAM},{encoding:'jsonParsed',commitment:'confirmed'}],endpoint),
    rpc('getTokenAccountsByOwner',[address,{programId:TOKEN_2022_PROGRAM},{encoding:'jsonParsed',commitment:'confirmed'}],endpoint).catch(() => ({value:[]})),
    rpc('getSignaturesForAddress',[address,{limit,commitment:'confirmed'}],endpoint)
  ]);
  if (!balance || typeof balance.value !== 'number') throw new Error('Could not read this address balance. Check the address or RPC endpoint.');
  const allTokens = [...(tokenClassic?.value || []),...(token2022?.value || [])];
  const holdingsMap = new Map();
  for (const row of allTokens) {
    const info = row?.account?.data?.parsed?.info;
    if (!info?.mint || !info.tokenAmount) continue;
    const previous = holdingsMap.get(info.mint) || {mint:info.mint,amount:0,decimals:info.tokenAmount.decimals || 0,accounts:0};
    previous.amount += Number(info.tokenAmount.uiAmountString ?? info.tokenAmount.uiAmount ?? 0);
    previous.accounts += 1; holdingsMap.set(info.mint,previous);
  }
  showStatus(`Loading details for ${signatures.length} recent transaction(s)…`,'loading');
  const txRows = await mapLimit(signatures,4,async signatureInfo => {
    try {
      const tx = await rpc('getTransaction',[signatureInfo.signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}],endpoint);
      if (!tx) return {signature:signatureInfo.signature,blockTime:signatureInfo.blockTime,success:!signatureInfo.err,error:signatureInfo.err,feeSol:null,solDelta:null,programs:[],tokenDeltas:[],events:[],detailsUnavailable:true,slot:signatureInfo.slot};
      return summarizeTransaction(signatureInfo,tx,address);
    } catch (error) {
      return {signature:signatureInfo.signature,blockTime:signatureInfo.blockTime,success:!signatureInfo.err,error:signatureInfo.err,feeSol:null,solDelta:null,programs:[],tokenDeltas:[],events:[],detailsUnavailable:true,fetchError:error.message,slot:signatureInfo.slot};
    }
  });
  const txs = txRows.filter(Boolean);
  const valid = txs.filter(t => !t.fetchError);
  const failed = txs.filter(t => !t.success).length;
  const programCounts = new Map();
  for (const tx of valid) for (const p of tx.programs) programCounts.set(p.id,(programCounts.get(p.id)||0)+1);
  return {
    address, network:'mainnet-beta', scannedAt:new Date().toISOString(), balanceLamports:balance.value,
    balanceSol:balance.value/1e9, tokenAccounts:allTokens.length,
    tokens:[...holdingsMap.values()].filter(t=>t.amount>0).sort((a,b)=>b.amount-a.amount),
    signaturesRequested:limit, transactionCount:txs.length, detailsFetched:valid.filter(t=>!t.detailsUnavailable).length,
    successful:txs.filter(t=>t.success).length, failed, transactions:txs,
    programUsage:[...programCounts.entries()].map(([id,count])=>({id,label:PROGRAMS.get(id)||'Unlabelled program',count})).sort((a,b)=>b.count-a.count)
  };
}
function buildSignals(report) {
  const txs = report.transactions.filter(t=>!t.fetchError);
  const signals=[];
  if (report.failed > 0) signals.push({type:'warn',icon:'!',title:`${report.failed} failed transaction(s) in this sample`,body:'Failed transactions can still consume network fees. Inspect each signature and its error before drawing conclusions.'});
  else signals.push({type:'good',icon:'✓',title:'No failed transactions in the scanned sample',body:'All returned signatures in this limited sample are marked successful by the RPC response.'});
  const unknown = new Map();
  for (const tx of txs) for (const p of tx.programs) if (p.label==='Unlabelled program') unknown.set(p.id,(unknown.get(p.id)||0)+1);
  if (unknown.size) signals.push({type:'warn',icon:'◇',title:`${unknown.size} unlabelled program ID(s) observed`,body:'These program IDs are not in Sentinel’s small built-in label list. This does not mean they are malicious; verify them independently.'});
  else signals.push({type:'good',icon:'◇',title:'No unlabelled program IDs in parsed instructions',body:'All parsed instruction program IDs matched Sentinel’s built-in labels. This is not a guarantee of safety.'});
  const feeRows=txs.filter(t=>Number.isFinite(t.feeSol));
  const avgFee=feeRows.length?feeRows.reduce((s,t)=>s+t.feeSol,0)/feeRows.length:0;
  signals.push({type:'neutral',icon:'◎',title:`Average network fee: ${formatNumber(avgFee,8)} SOL`,body:`Calculated from ${feeRows.length} transaction detail record(s). Priority fees and application-level charges may not be represented as a simple average.`});
  const withTokenMoves=txs.filter(t=>t.tokenDeltas?.length).length;
  signals.push({type:'neutral',icon:'⇄',title:`${withTokenMoves} transaction(s) show token balance changes`,body:'Changes are derived from the wallet’s pre/post token balances when the RPC exposes the wallet owner or account index.'});
  const net=txs.filter(t=>Number.isFinite(t.solDelta)).reduce((s,t)=>s+t.solDelta,0);
  signals.push({type:'neutral',icon:'Σ',title:`Net SOL change across inspected transactions: ${net>=0?'+':''}${formatNumber(net,8)} SOL`,body:'This is the sum of per-transaction net balance deltas in the sample, not a complete historical income or spending statement.'});
  return signals;
}
function renderReport(report) {
  $('dashboard').classList.remove('hidden');
  $('ai-output').innerHTML='<div class="ai-placeholder"><span class="sparkle">✳</span><span>Generate a new briefing for this wallet scan.</span></div>';
  $('wallet-label').textContent=shortAddress(report.address,12,10);
  $('wallet-label').title=report.address;
  $('wallet-explorer').href=`https://explorer.solana.com/address/${encodeURIComponent(report.address)}`;
  $('sol-balance').textContent=`${formatNumber(report.balanceSol,6)} SOL`;
  $('tx-count').textContent=report.transactionCount;
  $('success-rate').textContent=report.transactionCount?`${Math.round(report.successful/report.transactionCount*100)}%`:'—';
  $('success-note').textContent=`${report.successful} successful · ${report.failed} failed`;
  $('token-count').textContent=report.tokens.length;
  $('tx-window').textContent=`${report.detailsFetched} detailed · ${report.transactionCount} signatures`;
  $('activity-count').textContent=`${report.transactionCount} ITEMS`;
  $('token-count-chip').textContent=`${report.tokens.length} TOKENS`;
  renderActivity(report);renderTokens(report);renderSignals(report);renderDetails(report);
  $('ai-button').disabled=false;
  $('dashboard').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderActivity(report) {
  const body=$('activity-body');body.replaceChildren();
  if (!report.transactions.length) {body.innerHTML='<tr><td colspan="4" class="empty-cell">No recent signatures returned for this address.</td></tr>';return;}
  for(const tx of report.transactions){
    const tr=document.createElement('tr');
    const change=Number.isFinite(tx.solDelta)?`${tx.solDelta>0?'+':''}${formatNumber(tx.solDelta,6)} SOL`:'—';
    const changeClass=Number.isFinite(tx.solDelta)?(tx.solDelta>0?'amount-positive':tx.solDelta<0?'amount-negative':'amount-neutral'):'amount-neutral';
    tr.innerHTML=`<td><a class="tx-link" href="https://explorer.solana.com/tx/${encodeURIComponent(tx.signature)}" target="_blank" rel="noreferrer"><code>${escapeHtml(shortAddress(tx.signature,7,5))} ↗</code></a></td><td>${escapeHtml(formatTime(tx.blockTime))}</td><td class="${changeClass}">${escapeHtml(change)}</td><td class="${tx.success?'state-ok':'state-fail'}">${tx.fetchError?'DETAIL ERROR':tx.detailsUnavailable?'SIGNATURE ONLY':tx.success?'CONFIRMED':'FAILED'}</td>`;
    body.append(tr);
  }
}
function renderTokens(report) {
  const list=$('token-list');list.replaceChildren();
  if(!report.tokens.length){list.innerHTML='<div class="empty-state">No non-zero SPL token balances were returned for this address.</div>';return;}
  for(const token of report.tokens){const row=document.createElement('div');row.className='token-item';row.innerHTML=`<div class="token-name"><strong>${escapeHtml(shortAddress(token.mint,10,8))}</strong><code>${escapeHtml(token.mint)}</code></div><div class="token-amount">${escapeHtml(formatNumber(token.amount,Math.min(8,token.decimals)))}<small>${token.accounts} account(s) · ${token.decimals} decimals</small></div>`;list.append(row);}
}
function renderSignals(report) {
  const node=$('signals-list');node.replaceChildren();
  for(const signal of buildSignals(report)){const row=document.createElement('div');row.className=`signal-item ${signal.type}`;row.innerHTML=`<div class="signal-icon">${escapeHtml(signal.icon)}</div><div><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.body)}</p></div>`;node.append(row);}
}
function renderDetails(report) {
  const node=$('transaction-details');node.replaceChildren();
  if(!report.transactions.length){node.innerHTML='<div class="empty-state">No transaction details available.</div>';return;}
  for(const tx of report.transactions){
    const card=document.createElement('article');card.className='detail-card';
    const status=tx.fetchError?'Detail fetch failed':tx.detailsUnavailable?'Parsed detail unavailable':tx.success?'Confirmed transaction':'Failed transaction';
    const details=[...tx.programs.map(p=>p.label),...tx.tokenDeltas.map(t=>`${t.amount>=0?'+':''}${formatNumber(t.amount,6)} token · ${shortAddress(t.mint,6,5)}`),...tx.events.map(e=>e.kind)];
    const tags=details.length?details.slice(0,8).map(x=>`<span class="detail-tag">${escapeHtml(x)}</span>`).join(''):'<span class="detail-tag">No parsed instruction details from RPC</span>';
    card.innerHTML=`<div class="detail-top"><div><div class="detail-title">${escapeHtml(shortAddress(tx.signature,12,10))}</div><div class="detail-meta">${escapeHtml(formatTime(tx.blockTime))} · Slot ${escapeHtml(tx.slot??'—')} · Fee ${escapeHtml(tx.feeSol===null?'—':formatNumber(tx.feeSol,8)+' SOL')}</div></div><a class="tx-link" href="https://explorer.solana.com/tx/${encodeURIComponent(tx.signature)}" target="_blank" rel="noreferrer">Explorer ↗</a></div><div class="detail-body"><span class="detail-tag ${tx.success?'mint':'red'}">${escapeHtml(status)}</span>${tags}</div>`;
    node.append(card);
  }
}
function makeAiContext(report) {
  return {
    wallet:report.address,network:report.network,scannedAt:report.scannedAt,
    currentSolBalance:report.balanceSol,tokenHoldings:report.tokens.slice(0,25).map(t=>({mint:t.mint,quantity:t.amount,decimals:t.decimals,accounts:t.accounts})),
    inspectedTransactions:report.transactions.slice(0,30).map(t=>({signature:t.signature,time:t.blockTime?new Date(t.blockTime*1000).toISOString():null,success:t.success,solNetChange:t.solDelta,networkFeeSol:t.feeSol,programs:t.programs.map(p=>({id:p.id,label:p.label})),tokenBalanceChanges:t.tokenDeltas,parsedEvents:t.events,detailUnavailable:!!t.detailsUnavailable,fetchError:!!t.fetchError})),
    signals:buildSignals(report),sampleSize:report.transactionCount
  };
}
async function generateBriefing() {
  if(!currentReport)return;
  const key=$('gemini-key').value.trim();
  if(!key){toast('Enter a Gemini API key first.');$('gemini-key').focus();return;}
  const button=$('ai-button');button.disabled=true;$('ai-output').innerHTML='<div class="ai-loading">✳ Reading the evidence and preparing your wallet briefing…</div>';
  try{
    const context=makeAiContext(currentReport);
    const prompt=`You are Solana Sentinel, a cautious on-chain activity explainer. Analyze ONLY the JSON evidence supplied below. Never infer wallet owner identity or intent. Never call a wallet malicious, safe, fraudulent, or compromised. Distinguish directly observed facts from interpretations. If data is incomplete, say so. Avoid speculative USD valuations. Do not invent token symbols, protocol names or missing transaction details. Explain unfamiliar program IDs as unknown, not dangerous. Give a concise, useful report with these exact sections: 1) Executive summary 2) What the wallet did (use counts and observed flows) 3) Things worth reviewing (careful, non-alarmist) 4) Data limitations 5) Suggested next checks. State that this is not a security audit or financial advice. Keep it under 450 words. Evidence JSON:\n${JSON.stringify(context)}`;
    const model=$('gemini-model').value||MODEL_FALLBACK;
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:1000}}),signal:AbortSignal.timeout(45000)
    });
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error?.message||`Gemini returned HTTP ${response.status}`);
    const text=payload.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();
    if(!text)throw new Error('The model returned no text. Try again or choose another model.');
    const output=document.createElement('div');output.className='ai-content';output.textContent=text;$('ai-output').replaceChildren(output);toast('AI briefing generated.');
  }catch(error){$('ai-output').textContent=`AI briefing could not be generated: ${error.message}\n\nYour Solana wallet data is still available. Check the API key, model access and network connection, then try again.`;}
  finally{button.disabled=false;}
}
function exportReport() {
  if(!currentReport)return;
  const report={...currentReport,reviewSignals:buildSignals(currentReport),aiBriefing:$('ai-output').innerText||null,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`solana-sentinel-${currentReport.address.slice(0,8)}.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Evidence report exported.');
}
async function scanWallet() {
  const address=$('wallet-input').value.trim();
  if(!validateSolanaAddress(address)){showStatus('That does not look like a valid 32-byte Solana public address. Check the pasted address.','error');$('wallet-input').focus();return;}
  const button=$('scan-button');button.disabled=true;button.querySelector('span').textContent='Scanning…';$('dashboard').classList.add('hidden');
  try{
    const endpoint=$('rpc-input').value||DEFAULT_RPC;
    currentReport=await fetchWallet(address,Number($('limit-input').value)||20,endpoint);
    renderReport(currentReport);showStatus(`Scan complete. ${currentReport.transactionCount} signatures returned; ${currentReport.detailsFetched} transaction details parsed.`,'success');
  }catch(error){currentReport=null;showStatus(error.message||'Wallet scan failed.','error');}
  finally{button.disabled=false;button.querySelector('span').textContent='Analyze wallet';}
}
$('scan-button').addEventListener('click',scanWallet);
$('wallet-input').addEventListener('keydown',event=>{if(event.key==='Enter')scanWallet();});
$('ai-button').addEventListener('click',generateBriefing);
$('export-button').addEventListener('click',exportReport);
$('copy-wallet').addEventListener('click',async()=>{if(!currentReport)return;try{await navigator.clipboard.writeText(currentReport.address);toast('Wallet address copied.');}catch{toast('Clipboard access is unavailable in this browser.');}});
