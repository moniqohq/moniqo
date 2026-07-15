#!/usr/bin/env sh
# Moniqo is a personal finance management application designed to help users
# track, manage, and optimize their financial activities.
#
# Copyright (C) 2026 Moniqo <support@moniqo.in>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# Stops the backend and web server previously started by start.sh.
# Must be run from the archive root (the directory containing moniqo.pid).
set -eu
cd "$(dirname "$0")/.."

if [ ! -f moniqo.pid ]; then
	echo "moniqo.pid not found; nothing to stop"
	exit 0
fi

while read -r pid; do
	[ -n "$pid" ] && kill "$pid" 2>/dev/null || true
done < moniqo.pid

rm -f moniqo.pid
echo "moniqo stopped"
