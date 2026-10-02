export default function AgentScene({speaking,activeSpeaker,system}) {
return (
<div className="agentScene">
          {[
            ['atlas','LARA','ARAŞTIRMA'],
            ['jarvis','DİLAN','KOORDİNATÖR'],
            ['nexus','VERA','MÜHENDİSLİK']
          ].map(([id,name,role])=>(
            <div className={`agentPod agent-${id}${speaking && activeSpeaker===id ? ' isSpeaking' : ''}${system?.agentStates?.[id]?.state==='working' ? ' isWorking' : ''}${system?.agentStates?.[id]?.state==='error' ? ' hasError' : ''}`} key={id}>
              <div className="avatarHalo"/>
              <div className="avatarFigure">
                <svg className="robotPortrait" viewBox="0 0 200 240"
                     aria-hidden="true">
                  <defs>
                    <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#9baaba"/>
                      <stop offset=".22" stopColor="#354253"/>
                      <stop offset=".55" stopColor="#111925"/>
                      <stop offset=".82" stopColor="#536173"/>
                      <stop offset="1" stopColor="#18202d"/>
                    </linearGradient>
                    <linearGradient id={`face-${id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#111923"/>
                      <stop offset=".48" stopColor="#637184"/>
                      <stop offset=".52" stopColor="#354152"/>
                      <stop offset="1" stopColor="#101722"/>
                    </linearGradient>
                    <radialGradient id={`aura-${id}`}>
                      <stop offset="0" stopColor="currentColor" stopOpacity=".22"/>
                      <stop offset="1" stopColor="currentColor" stopOpacity="0"/>
                    </radialGradient>
                  </defs>

                  <ellipse cx="100" cy="117" rx="96" ry="110"
                           fill={`url(#aura-${id})`}/>

                  <path d="M78 139 L122 139 L127 166 L151 175
                           L178 192 L192 235 L8 235 L22 192
                           L49 175 L73 166Z"
                        fill={`url(#metal-${id})`} stroke="#8290a2"
                        strokeWidth="1"/>

                  <path d="M80 144 L120 144 L118 170 L100 183 L82 170Z"
                        fill="#101722" stroke="#56667b"/>
                  <path d="M86 150H114 M85 157H115 M86 164H114"
                        stroke="currentColor" opacity=".55"/>

                  <path d="M48 175 L82 180 L100 202 L64 222 L22 195Z
                           M152 175 L118 180 L100 202 L136 222 L178 195Z"
                        fill="#182230" stroke="#718096"/>
                  <path d="M28 196L62 184 M172 196L138 184
                           M48 210L63 216 M152 210L137 216"
                        stroke="currentColor" strokeWidth="2"/>

                  <path d="M84 205 L116 205 L125 235 L75 235Z"
                        fill="#080f19" stroke="#617187"/>
                  <path d="M100 207L110 219L100 231L90 219Z"
                        fill="currentColor" className="robotCore"/>

                  <path d="M63 53 L137 53 L148 81 L145 117
                           L128 144 L100 158 L72 144 L55 117 L52 81Z"
                        fill={`url(#face-${id})`} stroke="#a1adbd"
                        strokeWidth="1.2"/>

                  <path d="M57 79 L46 87 L48 117 L61 125
                           M143 79 L154 87 L152 117 L139 125"
                        fill="#202b3b" stroke="#8190a4"/>
                  <path d="M49 94V108 M151 94V108"
                        stroke="currentColor" strokeWidth="3"/>

                  <path d="M55 76 L60 46 L79 29 L121 29
                           L140 46 L145 76 L127 66 L100 59 L73 66Z"
                        fill={`url(#metal-${id})`} stroke="#a2afbf"/>
                  <path d="M78 33 L88 58 M122 33 L112 58 M100 31V53"
                        stroke="#101822" strokeWidth="3"/>
                  <path d="M91 39H109" stroke="currentColor" strokeWidth="2"/>

                  <path d="M61 85L91 82L96 97L64 99Z
                           M139 85L109 82L104 97L136 99Z"
                        fill="#050b13" stroke="#71839a"/>

                  <path className="robotEyes"
                        d={id==='atlas'
                          ? 'M65 88L88 94 M112 94L135 88'
                          : id==='nexus'
                            ? 'M65 93L88 88 M112 92L135 94'
                            : 'M65 91H88 M112 91H135'}
                        stroke="currentColor" strokeWidth="3.5"
                        strokeLinecap="round"/>

                  <path d="M100 88L93 117L100 122L107 117Z"
                        fill="#8996a7" stroke="#243044"/>

                  <path d="M61 106L79 119L76 136
                           M139 106L121 119L124 136"
                        fill="none" stroke="#b0bdcc" opacity=".7"/>
                  <path d="M65 111L76 119 M135 111L124 119"
                        stroke="currentColor" opacity=".65"/>

                  <path d={id==='nexus'
                          ? 'M84 134Q100 140 117 130'
                          : id==='atlas'
                            ? 'M85 136Q100 129 115 136'
                            : 'M85 133H115'}
                        fill="none" stroke="#d2dbe5"
                        strokeWidth="2" strokeLinecap="round"/>

                  <path d="M82 143L100 151L118 143"
                        fill="none" stroke="#8999ad"/>
                </svg>
              </div>
              <div className="avatarBase"/>
              <b>{name}</b>
              <small>{role}</small>
              <span className="agentStatus" role="status">
                {speaking && activeSpeaker===id
                  ? 'Konuşuyor'
                  : !system
                    ? 'Bağlantı yok'
                    : system.agentStates?.[id]?.state==='working'
                      ? system.agentStates[id].activity
                      : system.agentStates?.[id]?.state==='error'
                        ? 'İşlem hatası'
                        : system.agentStates?.[id]?.state==='completed'
                          ? 'Yanıt hazır'
                          : 'Bekliyor'}
              </span>
            </div>
          ))}
          <div className="agentLink linkLeft"/>
          <div className="agentLink linkRight"/>
        </div>
)
}
