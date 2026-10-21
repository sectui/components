#!/usr/bin/env bash
# Drives examples/demo.tsx in a detached tmux and prints a screen capture after
# each step. Needs tmux, and node 26 on PATH (nix develop).
# Usage: npm run build:demo && bash scripts/drive-demo.sh
set -u
cd "$(dirname "$0")/.."
T="tmux -L sectui-demo"
step() { echo; echo "=============== $1"; }
cap() { $T capture-pane -p -t demo | sed -e 's/[[:space:]]*$//'; }
pause() { perl -e 'select(undef,undef,undef,0.4)'; }
keys() { $T send-keys -t demo "$@"; pause; }
click() { $T send-keys -t demo -l $'\e[<0;'"$1;$2"'M'; $T send-keys -t demo -l $'\e[<0;'"$1;$2"'m'; pause; }

$T kill-server 2>/dev/null
$T new-session -d -s demo -x 110 -y 26 "node --experimental-ffi --no-warnings dist/demo.js 2>/tmp/sectui-demo.err; echo EXITED code=\$?; sleep 5"
perl -e 'sleep 2'

step "1. start: Traffic tab, Flows pane focused, its shortcuts in the hint bar"; cap
keys j j m
step "2. j j m: third flow selected and flagged"; cap
keys M-l
step "3. alt+l: focus moves right to Request (hints change)"; cap
keys e; $T send-keys -t demo -l "xjm"; pause
step "4. e then typing xjm: text goes to the input, no list command ran"; cap
keys Escape
step "5. escape: back to the Request pane"; cap
keys M-j p
step "6. alt+j then p: popup opens over Response"; cap
keys BSpace BSpace BSpace BSpace; $T send-keys -t demo -l "txt"; keys Enter
step "7. edit + enter: popup closed, answer shown, focus back on Response"; cap
keys Tab
step "8. tab: pane.next cycles to Flows"; cap
keys C-p
step "9. ctrl+p: palette lists the commands reachable from Flows"; cap
$T send-keys -t demo -l "unflag"; pause
step "10. typing 'unflag' filters (third row is flagged and selected)"; cap
keys Enter
step "11. enter: Unflag ran in the Flows context"; cap
click 80 20
step "12. mouse click on Response: it gets the focus"; cap
keys "]"
step "13. ]: Settings tab (palette swatches, shared config)"; cap
keys "["
step "14. [: back to Traffic, focus memory restores Response"; cap
keys q
step "15. q: quit"; cap
echo "--- stderr:"; cat /tmp/sectui-demo.err
$T kill-server 2>/dev/null
