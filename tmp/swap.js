import fs from 'fs';
const path = 'd:\\\\anti-gv\\\\11-1. KCC 견적계산(그린리모델링 적용)\\\\src\\\\components\\\\CustomerPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const lgBlockStart = content.indexOf('{/* 구독 PLUS 서비스 */}');
const specialBlockStart = content.indexOf('{/* 특별 무상 서비스 - Centered and Pink Spinning Border */}');

const lgBlockStrActual = content.substring(lgBlockStart, specialBlockStart);

const searchString = `                            </div>\r\n                        </div>\r\n`;
let specialBlockEndIndex = content.indexOf(searchString, specialBlockStart);
if (specialBlockEndIndex === -1) {
    // try with \n
    let ss2 = `                            </div>\n                        </div>\n`;
    specialBlockEndIndex = content.indexOf(ss2, specialBlockStart);
    if (specialBlockEndIndex !== -1) specialBlockEndIndex += ss2.length;
} else {
    specialBlockEndIndex += searchString.length;
}

const specialBlockStrActual = content.substring(specialBlockStart, specialBlockEndIndex);
const part1 = content.substring(0, lgBlockStart);
const part3 = content.substring(specialBlockEndIndex);

const newContent = part1 + specialBlockStrActual + lgBlockStrActual + part3;

fs.writeFileSync(path, newContent, 'utf8');
console.log("Done");
