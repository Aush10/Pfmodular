/**
 * Macaroni Lexer: Tokenizes the symbolic grammar
 * Every symbol has one primary grammatical purpose.
 * Uncontextualized words are treated as inert notes and ignored by arithmetic solvers.
 */

import { MacaroniToken, MacaroniTokenType } from './types';

export function tokenizeMacaroni(expression: string): MacaroniToken[] {
  const tokens: MacaroniToken[] = [];
  let i = 0;
  const len = expression.length;

  while (i < len) {
    const ch = expression[i];

    // Whitespace: skip
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Comments // ...
    if (ch === '/' && expression[i + 1] === '/') {
      const lineEnd = expression.indexOf('\n', i);
      i = lineEnd === -1 ? len : lineEnd + 1;
      continue;
    }

    // 1. Text Literals: "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < len && expression[i] !== quote) {
        if (expression[i] === '\\' && i + 1 < len) {
          str += expression[i + 1];
          i += 2;
        } else {
          str += expression[i];
          i++;
        }
      }
      if (i < len) i++; // closing quote
      tokens.push({ type: 'text_literal', value: str, raw: `${quote}${str}${quote}` });
      continue;
    }

    // 2. Interactive Query Prompt: <? "Prompt" | opt1 / opt2 / [] >
    const queryMatch = expression.slice(i).match(/^<\?\s*([^>]+)>/);
    if (queryMatch) {
      tokens.push({ type: 'query_prompt', value: queryMatch[1].trim(), raw: queryMatch[0] });
      i += queryMatch[0].length;
      continue;
    }

    // 3. UI Make Tagged Alert: <11"message"> or <"message">
    const uiMakeAlertMatch = expression.slice(i).match(/^<(\d*)\s*"([^"]*)">/);
    if (uiMakeAlertMatch) {
      const tag = uiMakeAlertMatch[1] ? parseInt(uiMakeAlertMatch[1], 10) : undefined;
      const msg = uiMakeAlertMatch[2];
      tokens.push({
        type: 'ui_make',
        value: JSON.stringify({ tag, message: msg }),
        raw: uiMakeAlertMatch[0],
      });
      i += uiMakeAlertMatch[0].length;
      continue;
    }

    // 4. Buff Make Construct: <^{7:2}+4>, <^AC.Armor+4>, <^ENHANCEMENTBONUSTOAC+4>, or <^>
    const buffMakeMatch = expression.slice(i).match(/^<\^\s*([^>]*)>/);
    if (buffMakeMatch) {
      const inner = buffMakeMatch[1].trim();
      tokens.push({
        type: 'buff_make',
        value: inner || 'make_buff',
        raw: buffMakeMatch[0],
      });
      i += buffMakeMatch[0].length;
      continue;
    }

    if (expression.slice(i, i + 3) === '<?>') {
      tokens.push({ type: 'query_prompt', value: '', raw: '<?>' });
      i += 3;
      continue;
    }

    // 5. Send Push: >>target, >>HP-5, >>~target^HP-5
    const sendMatch = expression.slice(i).match(/^>>([~A-Za-z0-9_]+(?:\^[A-Za-z0-9_]+)?)(?:\s*([+-]\s*[0-9a-zA-Z_]+))?/);
    if (sendMatch) {
      const target = sendMatch[1];
      const delta = sendMatch[2] ? sendMatch[2].replace(/\s+/g, '') : '';
      tokens.push({ type: 'send_push', value: `${target}${delta}`, raw: sendMatch[0] });
      i += sendMatch[0].length;
      continue;
    }

    // 6. Listen / Pull: <<macro_name
    const pullMatch = expression.slice(i).match(/^<<([a-zA-Z0-9_.]+)/);
    if (pullMatch) {
      tokens.push({ type: 'pull_listen', value: pullMatch[1], raw: pullMatch[0] });
      i += pullMatch[0].length;
      continue;
    }

    // 7. Evaluate Bracket: [1d4 + #STR]
    if (ch === '[') {
      let bracketContent = '';
      let depth = 1;
      i++;
      while (i < len && depth > 0) {
        if (expression[i] === '[') depth++;
        else if (expression[i] === ']') depth--;
        if (depth > 0) bracketContent += expression[i];
        i++;
      }
      tokens.push({ type: 'eval_bracket', value: bracketContent.trim(), raw: `[${bracketContent}]` });
      continue;
    }

    // 8. Math-Only Context Call: {firebreath}
    if (ch === '{') {
      let content = '';
      let depth = 1;
      i++;
      while (i < len && depth > 0) {
        if (expression[i] === '{') depth++;
        else if (expression[i] === '}') depth--;
        if (depth > 0) content += expression[i];
        i++;
      }
      tokens.push({ type: 'math_call', value: content.trim(), raw: `{${content}}` });
      continue;
    }

    // 9. Field Delta Mutator: HP^-d6, HP^+10, rounds^-1, or standalone ^-d6
    const fieldDeltaMatch = expression.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\^([+-]?[0-9a-zA-Z_]+)/);
    if (fieldDeltaMatch) {
      tokens.push({
        type: 'delta_mutator',
        value: `${fieldDeltaMatch[1]}^${fieldDeltaMatch[2]}`,
        raw: fieldDeltaMatch[0],
      });
      i += fieldDeltaMatch[0].length;
      continue;
    }
    const deltaMatch = expression.slice(i).match(/^\^([+-]?[0-9a-zA-Z_]+)/);
    if (deltaMatch) {
      tokens.push({ type: 'delta_mutator', value: deltaMatch[1], raw: deltaMatch[0] });
      i += deltaMatch[0].length;
      continue;
    }

    // 10. External Scope: ~target, ~companion, ~wp-1
    const extMatch = expression.slice(i).match(/^~([a-zA-Z0-9_-]+)/);
    if (extMatch) {
      tokens.push({ type: 'external_scope', value: extMatch[1], raw: extMatch[0] });
      i += extMatch[0].length;
      continue;
    }

    // 11. Hash Call: #HP, #STR, #BAB, #(macro.1)
    const hashBracketMatch = expression.slice(i).match(/^#\(([^)]+)\)/);
    if (hashBracketMatch) {
      tokens.push({ type: 'hash_call', value: hashBracketMatch[1].trim(), raw: hashBracketMatch[0] });
      i += hashBracketMatch[0].length;
      continue;
    }
    const hashMatch = expression.slice(i).match(/^#([a-zA-Z0-9_]+(?:\.[0-9]+)?)/);
    if (hashMatch) {
      tokens.push({ type: 'hash_call', value: hashMatch[1], raw: hashMatch[0] });
      i += hashMatch[0].length;
      continue;
    }

    // 12. Slot Separator: &
    if (ch === '&') {
      tokens.push({ type: 'slot_separator', value: '&', raw: '&' });
      i++;
      continue;
    }

    // 13. Condition / Pipe Branch: || or |
    if (ch === '|') {
      if (expression[i + 1] === '|') {
        tokens.push({ type: 'pipe_branch', value: '||', raw: '||' });
        i += 2;
      } else {
        tokens.push({ type: 'pipe_branch', value: '|', raw: '|' });
        i++;
      }
      continue;
    }

    // 14. Terminal Action / Sub-macro execution: $ or $macro_name
    const dollarMatch = expression.slice(i).match(/^\$([a-zA-Z0-9_]*)/);
    if (dollarMatch) {
      tokens.push({ type: 'terminal_finish', value: dollarMatch[1] || '$', raw: dollarMatch[0] });
      i += dollarMatch[0].length;
      continue;
    }

    // 15. Stepper Trigger: !
    if (ch === '!') {
      tokens.push({ type: 'step_trigger', value: '!', raw: '!' });
      i++;
      continue;
    }

    // 16. Name Definition: identifier:
    const nameDefMatch = expression.slice(i).match(/^([a-zA-Z0-9_]+)\s*:/);
    if (nameDefMatch) {
      tokens.push({ type: 'name_def', value: nameDefMatch[1], raw: nameDefMatch[0] });
      i += nameDefMatch[0].length;
      continue;
    }

    // 17. Keywords: this, @me
    if (expression.slice(i).match(/^this\b/i)) {
      tokens.push({ type: 'keyword_this', value: 'this', raw: 'this' });
      i += 4;
      continue;
    }
    if (expression.slice(i).match(/^@me\b/i)) {
      tokens.push({ type: 'keyword_me', value: '@me', raw: '@me' });
      i += 3;
      continue;
    }

    // 18. Dice: e.g. 1d20, 2d6, 4d6k3
    const diceMatch = expression.slice(i).match(/^(\d*d\d+(?:[kKdD]\d+)?)/i);
    if (diceMatch) {
      tokens.push({ type: 'dice', value: diceMatch[1], raw: diceMatch[0] });
      i += diceMatch[0].length;
      continue;
    }

    // 19. Numbers: 10, 4.5
    const numMatch = expression.slice(i).match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[1], raw: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // 20. Operators: +, -, *, /, %, ^, =
    if (['+', '-', '*', '/', '%', '^', '=', '>', '<'].includes(ch)) {
      tokens.push({ type: 'operator', value: ch, raw: ch });
      i++;
      continue;
    }

    // 21. Punctuation: (, ), ,, :
    if (['(', ')', ',', ':'].includes(ch)) {
      tokens.push({ type: 'punctuation', value: ch, raw: ch });
      i++;
      continue;
    }

    // 22. Uncontextualized words -> inert text (ignored in math calculations)
    const wordMatch = expression.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (wordMatch) {
      const word = wordMatch[1];
      if (['floor', 'round', 'ceil', 'min', 'max', 'abs', 'sqrt', 'dc'].includes(word.toLowerCase())) {
        tokens.push({ type: 'operator', value: word.toLowerCase(), raw: word });
      } else {
        tokens.push({ type: 'inert_text', value: word, raw: word });
      }
      i += word.length;
      continue;
    }

    // Fallback unknown
    tokens.push({ type: 'inert_text', value: ch, raw: ch });
    i++;
  }

  return tokens;
}
