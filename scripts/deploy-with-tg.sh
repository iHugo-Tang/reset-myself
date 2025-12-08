#!/usr/bin/env bash

set -euo pipefail

log() {
	printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

require_env() {
	local name="$1"
	if [ -z "${!name:-}" ]; then
		log "缺少环境变量：${name}"
		exit 1
	fi
}

send_msg() {
	local text="$1"
	curl -sS -X POST \
		"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
		-d "chat_id=${TELEGRAM_CHAT_ID}" \
		-d "text=${text}" \
		>${CURL_OUTPUT:-/dev/null} || log "发送 Telegram 失败"
}

main() {
	require_env "TELEGRAM_BOT_TOKEN"
	require_env "TELEGRAM_CHAT_ID"

	log "开始部署"
	send_msg "🚀 开始部署 reset-myself"

	if pnpm run deploy:core; then
		log "部署成功"
		send_msg "✅ 部署成功：$(date -u +"%Y-%m-%d %H:%M UTC")"
	else
		status=$?
		log "部署失败，退出码 ${status}"
		send_msg "❌ 部署失败，退出码 ${status}"
		exit "${status}"
	fi
}

main "$@"
