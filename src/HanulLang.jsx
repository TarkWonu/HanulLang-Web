import React, { useState } from "react";
import "./HanulLang.css";

class JangHanul {
  constructor(input = "", logFn = () => {}) {
    this.data = new Array(2 ** 16).fill(0);
    this.output = "";
    this.log = "";
    this.logFn = logFn;
    this.inputLines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  logError(msg) {
    this.log += `[에러] ${msg}\n`;
    this.logFn(this.log);
  }

  logEnd(msg) {
    this.log += `[종료] ${msg}\n`;
    this.logFn(this.log);
  }

  // 숫자 해석기
  parseNum(token) {
    try {
      if (token.startsWith("호") && token.includes("엥")) {
        const base = (token.match(/에/g) || []).length + 2;
        return base - (token.match(/\./g) || []).length;
      } else if (token.startsWith("하와")) {
        const base = (token.match(/와/g) || []).length * -1;
        return base + (token.match(/\./g) || []).length;
      } else if (token.startsWith("디") && token.includes("미")) {
        const idx = (token.match(/이/g) || []).length;
        return this.data[idx];
      } else {
        this.logError(`${token}도 에겐같이 하네;;`);
        return 0;
      }
    } catch (e) {
      this.logError(`정수 파싱 중 오류: ${token}`);
      return 0;
    }
  }

  parseOp(token) {
    if (token === "21대3") return "+";
    if (token === "훌쩍") return "*";
    this.logError(`${token}도 에겐같이 하네;;`);
    return "";
  }

  getIndex(token) {
    if (!(token.startsWith("디") && token.endsWith("미"))) {
      this.logError(`${token}도 에겐같이 하네;;`);
      return 0;
    }
    return (token.match(/이/g) || []).length;
  }

  // 수식 계산기
  calculate(code) {
    try {
      const tokens = code.split(/\s+/).filter(Boolean);
      const seq = [];

      for (const tok of tokens) {
        if (tok === "21대3" || tok === "훌쩍") seq.push(this.parseOp(tok));
        else seq.push(String(this.parseNum(tok)));
      }

      // 곱셈 먼저
      const stack = [];
      let i = 0;
      while (i < seq.length) {
        const cur = seq[i];
        if (cur === "*") {
          if (!stack.length || i + 1 >= seq.length) {
            this.logError("곱셈 오류 발생");
            return 0;
          }
          const prev = parseInt(stack.pop());
          const nxt = parseInt(seq[i + 1]);
          stack.push(String(prev * nxt));
          i += 2;
        } else {
          stack.push(cur);
          i++;
        }
      }

      // 덧셈 처리
      let result = 0;
      for (const s of stack) {
        if (s === "+") continue;
        result += parseInt(s);
      }
      return result;
    } catch (e) {
      this.logError(`수식 계산 중 오류: ${code}`);
      return 0;
    }
  }

  static type(code) {
    code = code.trim();
    if (!code) return null;
    const head = code.split(/\s+/, 1)[0];

    if (code.includes("가을야구?")) return "IF";
    if (code.includes("디떨!")) return "MOVE";
    if (code.includes("서류제출")) return "PRINT";
    if (code.includes("키움아래")) return "INPUT";
    if (head.startsWith("디") && head.endsWith("미")) return "DEF";
    if (code.includes("에겐")) return "PRINTCHAR";
    if (code.includes("탈선린")) return "END";
    if (code.includes("30실점")) return "JUMP";
    return null;
  }

  stripComment(line) {
  if (typeof line !== "string") return ""; // ✅ undefined 안전 처리
  const idx = line.indexOf("#");
  return idx >= 0 ? line.slice(0, idx) : line;
}

  compileLine(code) {
    code = this.stripComment(code).trim();
    if (!code) return null;

    const TYPE = JangHanul.type(code);

    try {
      if (TYPE === "DEF") {
        const parts = code.split(/\s+/);
        if (parts.length < 2)
            return this.logError("대입도 에겐같이 하네;;");
        const varTok = parts[0];
        const expr = parts.slice(1).join(" ");
        const idx = this.getIndex(varTok);
        this.data[idx] = this.calculate(expr);
        return null;
    }

      if (TYPE === "INPUT") {
        const expr = code.replace("키움아래", "").trim();
        const idx = this.getIndex(expr);
        const valStr = this.inputLines.shift() ?? "0";
        const val = parseInt(valStr);
        this.data[idx] = isNaN(val) ? 0 : val;
        return null;
      }

      if (TYPE === "PRINT") {
        let expr = code.replace("서류제출", "").trim();
        let newline = false;
        if (expr.endsWith("제발")) {
          newline = true;
          expr = expr.slice(0, -2).trim();
        }
        const val = this.calculate(expr);
        this.output += val + (newline ? "\n" : "");
        return null;
      }

      if (TYPE === "PRINTCHAR") {
        let expr = code.replace("에겐", "").trim();
        let newline = false;
        if (expr.endsWith("제발")) {
          newline = true;
          expr = expr.slice(0, -2).trim();
        }
        const val = this.calculate(expr);
        this.output += String.fromCharCode(val) + (newline ? "\n" : "");
        return null;
      }

      if (TYPE === "MOVE") {
        let body = code.replace("디떨!", "").trim();
        let srcTok, dstTok;
        if (body.includes("->"))
          [srcTok, dstTok] = body.split("->").map((s) => s.trim());
        else {
          const parts = body.split(/\s+/);
          if (parts.length !== 2)
            return this.logError("MOVE도 에겐같이 하네;;");
          [srcTok, dstTok] = parts;
        }
        const srcIdx = this.getIndex(srcTok);
        const dstIdx = this.getIndex(dstTok);
        this.data[dstIdx] = this.data[srcIdx];
        return null;
      }

      if (TYPE === "IF") {
        const match = code.match(/^가을야구\?\s*(.+?)\s+그러면\s+(.+?)(?:\s+아니면\s+(.+))?$/);

        if (!match) {
            return this.logError("IF 문법도 에겐같이 하네;;");
        }

        const [, condExpr, thenCode, elseCode] = match;
        const condVal = this.calculate(condExpr.trim());

        let result = null;

        if (condVal !== 0) {
            result = this.compileLine(thenCode.trim());
        } else if (elseCode) {
            result = this.compileLine(elseCode.trim());
        }

        // ✅ if 내부에서 점프나 종료가 발생하면 그대로 상위로 전달
        if (result === "END" || typeof result === "number") {
            return result;
        }

        return null;
        }


      if (TYPE === "JUMP") {
        const expr = code.replace("30실점", "").trim();
        const target = this.calculate(expr);

        if (isNaN(target)) {
          this.logError(`${expr}도 에겐같이 하네;;`);
          return null;
        }

        // 빈 줄 포함 줄 번호 기준 이동
        return target;
      }

      if (TYPE === "END") {
        this.logEnd("탈선린해도 디미는 못간다 한울한울아");
        return "END";
      }
    } catch (err) {
      this.logError(`라인 실행 오류: ${err.message}`);
    }

    return null;
  }

  compile(code) {
    const lines = code.split(/\r?\n/); // 빈 줄 포함
    if (!lines.length) return;

    const head = lines[0].replace(/\s+/g, "");
    const tail = lines[lines.length - 1].replace(/\s+/g, "");
    if (!head.startsWith("대체누가") || !tail.startsWith("디미고를서류로떨어짐?")) {
      this.logError("이게 어떻게 에겐이냐 ㅋㅋ");
      return;
    }

    let index = 0;
    let steps = 0;

    while (index < lines.length) {
      const c = lines[index];
      const res = this.compileLine(c);
      if (res === "END") break;

      if (typeof res === "number") {
        index = res - 2; // 1-based 줄번호 → 실제 index 조정
      }

      index++;
      steps++;
      if (steps > 100000) {
        this.logError(`${index}번째 줄에서 무한 루프가 감지되었습니다.`);
        break;
      }
    }
  }
}

export default function HanulLang() {
  const [code, setCode] = useState(`대체 누가

에겐 호에에에에에에엥 훌쩍 호에에에에에에에엥 
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에엥 21대3 호엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥 21대3 호에엥
에겐 호에에엥 훌쩍 호에에에에에에에에에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에엥 21대3 호에에에에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥 21대3 호에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥 21대3 호에에에에엥
에겐 호에에에에에에에엥 훌쩍 호에에에에에에에에에에엥
에겐 호에에에에에에에에엥 훌쩍 호에에에에에에에에엥
에겐 호에에에에에에에에에엥 훌쩍 호에엥 


디미고를 서류로 떨어짐?`);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [logs, setLogs] = useState("");

  const run = () => {
    const jh = new JangHanul(input, setLogs);
    jh.compile(code);
    setOutput(jh.output);
  };

  return (
    
    <div className="container">
    <title>한울랭</title>
      <h1>💻 혁명적인 한울랭 웹 실행기</h1>

      <div className="editor-zone">
        <textarea
          className="code-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <textarea
          className="input-editor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="입력값..."
        />
      </div>

      <div className="btns">
        <button className="run" onClick={run}>
          ▶ 실행
        </button>
        <button
          className="reset"
          onClick={() => {
            setOutput("");
            setLogs("");
          }}
        >
          ♻ 초기화
        </button>
      </div>

      <div className="output-zone">
        <div className="output-area">{output || "출력 결과 없음"}</div>
        <div className="error-log">{logs || "에러 로그 없음"}</div>
      </div>
    </div>
  );
}
