import '../pages/Home.css'

const TOP_TEXT =
  'SIGNAL ACQUIRED + 建设中 + ネットワーク接続を待機中 + ERR_NULL + AWAITING_CORE_STRUCT + 正在加载全局视野 + SYSTEM_OFFLINE + 0x7F8A + LAT 43.2 + LONG 127.9 + SYNC_PENDING + 监听中 + UPLINK LOST + '

const BOT_TEXT =
  'CENTRUM UBIQUE CIRCUMFERENTIA NUSQUAM // 视觉 // 听觉 // 万籁 // 谛听万物 // 大音希声 大象无形 // AUDI VIDE TACE // 耳听八方 // '

interface Props {
  variant: 'top' | 'bot'
}

function Ticker({ variant }: Props) {
  const text = variant === 'top' ? TOP_TEXT : BOT_TEXT
  const repeated = text.repeat(6)
  return (
    <div className={variant === 'top' ? 'ticker-top' : 'ticker-bot'}>
      <div className={`tick-inner${variant === 'bot' ? ' rev' : ''}`}>
        {repeated + repeated}
      </div>
    </div>
  )
}

export default Ticker
