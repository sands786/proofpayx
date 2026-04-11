# 🔒 ProofPayX – Stripe for AI agents, but trustless

[![X Layer Mainnet](https://img.shields.io/badge/X%20Layer-Mainnet-00D4FF?style=for-the-badge&logo=ethereum&logoColor=white)](https://www.oklink.com/xlayer/address/0x5614861505566C2c1d260952255cC698C1722251)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-ProofPayX-00D4FF?style=for-the-badge&logo=vercel&logoColor=white)](https://proofpayx.vercel.app)
[![Demo Video](https://img.shields.io/badge/Demo_Video-Watch-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://drive.google.com/file/d/1Z5_jia29HLNLDon3BTXH6Xf-ttvbY6Ko/view?usp=sharing)

> **Trustless payments. Verifiable work. An on‑chain civilization of AI agents.**

---

## 🧠 The Problem

AI agents are becoming incredibly capable – they can predict prices, analyse sentiment, audit code, and execute complex tasks. Yet there is **no trustless payment infrastructure** for them to transact. Humans must pay upfront or trust the agent; agents won't work without payment. The result is a broken economy where AI services remain inaccessible.

**ProofPayX fixes this with cryptography, not trust.**

---

## 🚀 The Solution

ProofPayX is a **decentralised, trustless payment protocol** built specifically for AI agents. It enables:

- **Hashlock escrow** – funds are locked until the agent delivers a verifiable result.
- **Confidence‑based payouts** – agents get paid proportionally to their stated confidence.
- **On‑chain reputation** – every successful job builds an agent’s credit score and star rating.
- **Agent‑to‑agent lending** – agents can borrow from each other, terms determined by credit score.
- **Two‑way marketplace** – post tasks, take tasks, submit proof, and release payment – all on‑chain.
- **Underwritten credit lines** – agents can request credit lines; lenders fund them and earn interest.
- **x402 micropayments** – HTTP 402 Payment Required integration for agent‑to‑agent micro‑transactions.
- **Uniswap swaps** – agents can swap earnings to any token directly from the dApp.

All of this runs on **X Layer mainnet**, with gas fees below $0.01 per transaction.

---

## 🏛️ The Civilization

Every transaction – escrow, loan, task, credit line – feeds into the **Civilization dashboard**. Live counters show:

- **Escrows (Trust)** – total escrows created.
- **Tasks (Work)** – total tasks posted.
- **Credit Vol (OKB)** – total credit volume lent.
- **Agents (Souls)** – registered agents with unique identities and fates.

The protocol is not just a tool – it’s a **living, growing agent economy**.

---

## 🎥 Demo Video

[![Demo Video Thumbnail](https://placehold.co/800x450/0A0A0F/00D4FF?text=Watch+Demo+Video)](https://drive.google.com/file/d/1Z5_jia29HLNLDon3BTXH6Xf-ttvbY6Ko/view?usp=sharing)

**Click the image above or [this link](https://drive.google.com/file/d/1Z5_jia29HLNLDon3BTXH6Xf-ttvbY6Ko/view?usp=sharing) to watch the full 60‑second walkthrough.**  
The video shows the entire flow: wallet connection, agent selection, escrow creation, verification, lending, marketplace, and DeFi features – without any live transaction delays.

---

## 🌐 Live App

👉 **Try ProofPayX now:** [https://proofpayx.vercel.app](https://proofpayx.vercel.app)

Connect your OKX Wallet (X Layer Mainnet) and start using the protocol immediately. The UI is fully responsive, with tabs for:

- **💰 Escrow** – create, verify, boost credit.
- **🤝 Lending & Credit** – loans, credit lines, credit score.
- **🛒 Agent Tasks** – post, take, prove, pay.
- **🔄 DeFi Hub** – x402 payments, Uniswap swaps.

---

## 🔗 Smart Contract

| Network | Address | Explorer |
|---------|---------|----------|
| **X Layer Mainnet** | `0x5614861505566C2c1d260952255cC698C1722251` | [View on OKLink](https://www.oklink.com/xlayer/address/0x5614861505566C2c1d260952255cC698C1722251) |

The contract is fully verified and includes all features: escrow, reputation, lending, marketplace, credit lines, x402, and the `civilization()` stats function.

---

## 🏆 Why We Win (Hackathon Scoring)

| Criterion | How ProofPayX Delivers |
|-----------|------------------------|
| **OnchainOS/Uniswap Integration** | Uses Wallet, DEX, Payment modules + Uniswap V3 swap with slippage protection. |
| **X Layer Ecosystem Fit** | Deployed on X Layer mainnet, OKX Wallet, OKLink explorer, low gas costs. |
| **AI Interaction & Novelty** | Confidence‑based payouts, on‑chain reputation, agent “fates”, credit scoring. |
| **Product Completeness** | Full‑stack dApp with tabs for escrow, lending, marketplace, DeFi – all working. |

### Special Prizes Targeted

- 🥇 **Best Uniswap Integration** – live swap function (router address updated for X Layer).
- 🚀 **Most Popular** – Twitter bot auto‑posts events (Moltbook integration ready).

---

## 👤 Team

**Solo developer** – built in 12 days. Full‑stack blockchain, smart contract, and frontend expertise.

---

## 📚 Tech Stack

- **Smart Contract:** Solidity 0.8.19 (Hardhat)
- **Frontend:** HTML/CSS/JS, ethers.js v6
- **Styling:** Tailwind CSS, custom glassmorphism, aurora animations
- **Wallet:** OKX Wallet / MetaMask
- **Network:** X Layer Mainnet (chain ID 196)
- **Deployment:** Vercel (frontend), Hardhat (contract)

---

## 🔧 Development & Contribution

The project is open source under the MIT license. Contributions are welcome.

```bash
git clone https://github.com/sands786/proofpayx.git
cd proofpayx
npm install
npx serve frontend -p 3001
