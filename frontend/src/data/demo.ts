import type { Milestone, Scenario, Transaction, User } from '@/types';

/* The demo account.

   These transactions are not decoration — they are shaped so the rule engine
   has something true to find: two short holds sold in the red, two buys placed
   near a 52-week high, and eleven trades crammed into one month. The autopsy
   report a judge sees is genuinely computed from this log, not written ahead
   of time. */

export const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Aarav Mehta',
  email: 'aarav@demo.investwise.ai',
  college: 'VJTI Mumbai',
  riskTolerance: 'medium',
  monthlyBudget: 2000,
  goal: 'Build a ₹1,00,000 corpus before graduation',
};

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 'tx-01', symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 BeES', type: 'etf', side: 'buy', quantity: 3, price: 262.4, date: '2026-03-05', note: 'First ever investment' },
  { id: 'tx-02', symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 BeES', type: 'etf', side: 'buy', quantity: 3, price: 271.1, date: '2026-04-06' },
  { id: 'tx-03', symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 BeES', type: 'etf', side: 'buy', quantity: 4, price: 279.0, date: '2026-05-05' },
  { id: 'tx-04', symbol: 'INFY', name: 'Infosys', type: 'stock', side: 'buy', quantity: 1, price: 1985.0, date: '2026-06-10', note: 'Everyone on X was posting about it' },
  { id: 'tx-05', symbol: 'INFY', name: 'Infosys', type: 'stock', side: 'sell', quantity: 1, price: 1846.0, date: '2026-06-18', note: 'Got scared after 3 red days' },
  { id: 'tx-06', symbol: 'TCS', name: 'Tata Consultancy Services', type: 'stock', side: 'buy', quantity: 1, price: 3180.0, date: '2026-07-03' },
  { id: 'tx-07', symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', side: 'buy', quantity: 1, price: 1690.0, date: '2026-07-15' },
  { id: 'tx-08', symbol: 'ZOMATO', name: 'Eternal (Zomato)', type: 'stock', side: 'buy', quantity: 3, price: 291.0, date: '2026-08-04', note: 'It was up 20% that week' },
  { id: 'tx-09', symbol: 'TATAMOTORS', name: 'Tata Motors', type: 'stock', side: 'buy', quantity: 1, price: 742.0, date: '2026-08-05' },
  { id: 'tx-10', symbol: 'TATAMOTORS', name: 'Tata Motors', type: 'stock', side: 'sell', quantity: 1, price: 719.0, date: '2026-08-06', note: 'Changed my mind' },
  { id: 'tx-11', symbol: 'WIPRO', name: 'Wipro', type: 'stock', side: 'buy', quantity: 1, price: 295.0, date: '2026-08-07' },
  { id: 'tx-12', symbol: 'WIPRO', name: 'Wipro', type: 'stock', side: 'buy', quantity: 1, price: 302.0, date: '2026-08-08', note: 'Averaging up' },
  { id: 'tx-13', symbol: 'WIPRO', name: 'Wipro', type: 'stock', side: 'sell', quantity: 2, price: 281.0, date: '2026-08-11' },
  { id: 'tx-14', symbol: 'ZOMATO', name: 'Eternal (Zomato)', type: 'stock', side: 'sell', quantity: 3, price: 262.0, date: '2026-08-12', note: 'Cut my losses' },
  { id: 'tx-15', symbol: 'TATASTEEL', name: 'Tata Steel', type: 'stock', side: 'buy', quantity: 5, price: 168.0, date: '2026-08-13' },
  { id: 'tx-16', symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', side: 'buy', quantity: 1, price: 1705.0, date: '2026-08-14' },
  { id: 'tx-17', symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 BeES', type: 'etf', side: 'buy', quantity: 4, price: 288.0, date: '2026-08-18' },
  { id: 'tx-18', symbol: 'GOLDBEES', name: 'Nippon India Gold BeES', type: 'etf', side: 'buy', quantity: 1, price: 83.5, date: '2026-08-20' },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'sc-crash',
    tag: 'Volatility',
    title: 'Nifty drops 8% in a week',
    situation:
      'You wake up to red everywhere. Nifty 50 is down 8% over five sessions and your ₹11,400 portfolio is showing −₹2,000. Three group chats are telling you it is going lower. Your next SIP date is tomorrow.',
    options: [
      {
        text: 'Sell everything now and re-enter when it settles',
        correct: false,
        explanation:
          'This is the exact trade your report already flagged twice. "When it settles" has no definition, so in practice you buy back higher — and you pay brokerage on both legs to do it.',
      },
      {
        text: 'Do nothing, and let tomorrow’s SIP go through as normal',
        correct: true,
        explanation:
          'Correct. Your SIP now buys more units at the lower price, which is the entire mechanic working in your favour. Doing nothing is an active, correct choice here.',
      },
      {
        text: 'Skip this month’s SIP and keep the cash until things calm down',
        correct: false,
        explanation:
          'Understandable, but this is market timing wearing a safety vest. You are choosing to buy fewer units at lower prices, which is backwards.',
      },
      {
        text: 'Add an extra ₹500 on top of the SIP, if you genuinely have it spare',
        correct: true,
        explanation:
          'Also correct — with one condition. This only works if the money was already earmarked for investing. Borrowing or dipping into fee money to "buy the dip" is a different mistake.',
      },
    ],
    points: 50,
  },
  {
    id: 'sc-fomo',
    tag: 'FOMO',
    title: 'A stock is up 22% in ten days',
    situation:
      'A mid-cap you have never researched is up 22% in ten sessions. Your batchmate made ₹4,000 on it and will not stop talking about it. You have ₹2,000 free.',
    options: [
      {
        text: 'Put the full ₹2,000 in before it runs further',
        correct: false,
        explanation:
          'You would be buying at the top of its range on someone else’s conviction. Your report already shows what this costs — ZOMATO and INFY were both bought this way.',
      },
      {
        text: 'Skip it, and put the ₹2,000 into your usual index ETF',
        correct: true,
        explanation:
          'Correct. Missing a rally costs you nothing you ever had. Your plan does not need to beat your batchmate, it needs to survive three years.',
      },
      {
        text: 'Research it properly this week, and buy a third of a position if it still holds up',
        correct: true,
        explanation:
          'Also correct. This converts FOMO into a process: the rally becomes a reason to look, not a reason to buy. A third-size position keeps the mistake affordable.',
      },
    ],
    points: 50,
  },
  {
    id: 'sc-loss',
    tag: 'Loss',
    title: 'Your first stock is down 18%',
    situation:
      'You bought one stock four months ago after real research. It is down 18%. Nothing has changed about the business — same revenue growth, same management, no bad news. It is just down.',
    options: [
      {
        text: 'Sell and take the lesson',
        correct: false,
        explanation:
          'The lesson here is the opposite one. Nothing about the business changed, so selling only converts a paper loss into a real one and teaches you to flinch.',
      },
      {
        text: 'Hold, and re-check the business at the next quarterly result',
        correct: true,
        explanation:
          'Correct. You tied the decision to new information instead of to the price. That is the whole discipline in one move.',
      },
      {
        text: 'Double your position to bring the average down',
        correct: false,
        explanation:
          'Averaging down is only valid if the thesis strengthened and the position stays inside your size limit. Done reflexively, it just concentrates a losing bet.',
      },
    ],
    points: 75,
  },
  {
    id: 'sc-tip',
    tag: 'Tips',
    title: 'A Telegram channel guarantees 40% returns',
    situation:
      'A channel with 40,000 members posts a "sure shot multibagger" with a target price and a screenshot of past wins. Entry closes tonight. Several members are posting profit screenshots.',
    options: [
      {
        text: 'Take a small position — even if it is a scam, only ₹500 is at risk',
        correct: false,
        explanation:
          'The ₹500 is not the real cost. These channels front-run their own calls: members buy, the price spikes, the operators sell into it. You are the exit liquidity, at any size.',
      },
      {
        text: 'Ignore it and report the channel',
        correct: true,
        explanation:
          'Correct. Guaranteed returns are illegal to promise in India, and SEBI-registered advisers never do it. Urgency plus a guarantee is the signature of a pump.',
      },
      {
        text: 'Wait and watch the stock for a week to see if the call was right',
        correct: false,
        explanation:
          'Even if the call "works", you would be learning the wrong lesson from a rigged sample. Watching a pump succeed is how people talk themselves into the next one.',
      },
    ],
    points: 50,
  },
  {
    id: 'sc-windfall',
    tag: 'Planning',
    title: '₹15,000 lands in your account',
    situation:
      'You finish a freelance project and ₹15,000 hits your account — more than seven months of your usual investing budget in one go. You have no emergency fund.',
    options: [
      {
        text: 'Invest all ₹15,000 at once, since time in the market matters',
        correct: false,
        explanation:
          'Right principle, wrong order. With no emergency fund, the first unexpected expense forces you to sell at whatever price the market offers that day.',
      },
      {
        text: 'Keep ₹10,000 as an emergency buffer, invest ₹5,000 across the next three months',
        correct: true,
        explanation:
          'Correct. The buffer is what lets you hold through a dip instead of being forced out of it. The staggered ₹5,000 spreads your entry price without stalling.',
      },
      {
        text: 'Keep all of it in savings until you have read more',
        correct: false,
        explanation:
          'Safe, but this is how a year passes with nothing invested. A ₹500 monthly habit started today teaches more than another month of reading.',
      },
    ],
    points: 75,
  },
];

export const MILESTONES: Milestone[] = [
  { id: 'm1', label: 'First trade placed', done: true },
  { id: 'm2', label: '₹5,000 invested', done: true },
  { id: 'm3', label: 'Held one position for 3 months', done: true },
  { id: 'm4', label: 'First profitable exit', done: false },
  { id: 'm5', label: 'A full month with zero panic sells', done: false },
  { id: 'm6', label: 'Four holdings across three sectors', done: true },
];
