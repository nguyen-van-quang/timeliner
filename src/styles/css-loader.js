/* CSS Loader for Timeliner - Auto-loads CSS when imported */

import { utils } from '../utils/utils.js';

const timelinerCSS = `
    ul.tree-animation {
        list-style: none;
        line-height: 2em;
    }
    ul.tree-animation li {
        position: relative;
    }
    ul.tree-animation li::before {
        position: absolute;
        left: -36px;
        top: 0;
        border-left: 1px solid gray;
        border-bottom: 1px solid gray;
        width: 25px;
        height: 2em;
        content: '';
    }
    ul.tree-animation li::after {
        position: absolute;
        left: -36px;
        bottom: 0;
        border-left: 1px solid gray;
        width: 8px;
        height: 100%;
        content: '';
    }
    ul.tree-animation li:last-child::after {
        display: none;
    }
    ul.tree-animation > li::after, ul.tree-animation > li::before {
        display: none;
    }
    .tree-animation summary {
        cursor: pointer;
    }
    .tree-animation summary:marker {
        display: none;
    }
    .tree-animation summary::-webkit-details-marker {
        display: none;
    }

    .timeline-cabinet {

    }
    .timeline-cabinet li:hover {
         background-color: gray;
    }
`;

// Function to inject CSS dynamically
function injectCSS(css) {
    const style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        // IE
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    document.head.appendChild(style);
    return style;
}

// Auto-inject CSS when this module is imported
let cssInjected = false;

function initializeCSS() {
    if (!cssInjected && typeof document !== 'undefined') {
        injectCSS(timelinerCSS);
        cssInjected = true;
        console.log('Timeliner CSS with pseudo-classes loaded');
    }
}

// Initialize CSS immediately
initializeCSS();

export { initializeCSS, timelinerCSS };