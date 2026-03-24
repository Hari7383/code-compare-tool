const DiffMatchPatch = require("diff-match-patch");
const dmp = new DiffMatchPatch();

function compareText(a, b) {
    const diff = dmp.diff_main(a, b);
    dmp.diff_cleanupSemantic(diff);
    return diff;
}

module.exports = { compareText };

function groupDiffs(diffs) {
    let blocks = [];
    let current = [];

    diffs.forEach(d => {
        if (d[0] !== 0) {
            current.push(d);
        } else {
            if (current.length) {
                blocks.push(current);
                current = [];
            }
        }
    });

    if (current.length) blocks.push(current);

    return blocks;
}