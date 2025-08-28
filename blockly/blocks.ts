


import { appState } from "../state.js";

declare var Blockly: any;

// --- DYNAMIC DROPDOWN GENERATORS ---

const soundNameDropdown = function() {
    if (!appState.activeSpriteId) return [['-', '']];
    const sprite = appState.sprites[appState.activeSpriteId];
    if (!sprite || !sprite.sounds || sprite.sounds.length === 0) {
        return [['-', '']];
    }
    return sprite.sounds.map(sound => [sound.name, sound.name]);
};

const spriteThumbnailDropdown = function() {
    const placeholder = { 
        src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzU1NSI+PHBhdGggZD0iTTExIDE4aDJ2LTJoLTJ2MnptMS0xNkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTktOC04LTh6bTAtMTRjLTIuMjEgMC00IDEuNzktNCA0aDJjMC0xLjEuOS0yIDItMnMyIC45IDIgMmMwIDItMyAxLjc1LTMgNWgyYzAtMi4yNSAzLTEuNSAzLTRzLTEuNzktNC00LTR6Ii8+PC9zdmc+', 
        width: 32, 
        height: 32, 
        alt: 'אין דמויות אחרות' 
    };
    
    if (!appState.activeSpriteId) return [[placeholder, '']];

    const otherSprites = Object.values(appState.sprites).filter(s => s.id !== appState.activeSpriteId);
    if (otherSprites.length === 0) {
        return [[placeholder, '']];
    }
    
    return otherSprites.map(sprite => ([
        { src: sprite.state.imageUrl, width: 32, height: 32, alt: sprite.name },
        sprite.id
    ]));
};

const backdropThumbnailDropdown = function() {
    const placeholder = {
        src: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#888"><path d="M21,3H3C1.9,3,1,3.9,1,5v14c0,1.1,0.9,2,2,2h18c1.1,0,2-0.9,2-2V5C23,3.9,22.1,3,21,3z M5,17l3.5-4.5l2.5,3.01L14.5,11l4.5,6H5z"/></svg>'),
        width: 48,
        height: 36,
        alt: 'אין רקעים זמינים'
    };

    if (!appState.stageBackdrops || appState.stageBackdrops.length === 0) {
        return [[placeholder, '']];
    }

    return appState.stageBackdrops.map(backdrop => ([
        { src: backdrop.url, width: 48, height: 36, alt: backdrop.name },
        backdrop.url
    ]));
};

const keyPressedDropdown = function() {
    const keys = [
        ['רווח', 'space'],
        ['חץ למעלה', 'up arrow'],
        ['חץ למטה', 'down arrow'],
        ['חץ ימינה', 'right arrow'],
        ['חץ שמאלה', 'left arrow'],
        ['כל מקש', 'any']
    ];
    // Add letters a-z
    for (let i = 97; i <= 122; i++) {
        const letter = String.fromCharCode(i);
        keys.push([letter, letter]);
    }
    // Add numbers 0-9
    for (let i = 0; i <= 9; i++) {
        keys.push([String(i), String(i)]);
    }
    return keys;
};

const speedDropdown = function() {
    return [
        [{
            src: 'https://codejredu.github.io/test/assets/blocklyicon/mediumspeed.svg',
            width: 40,
            height: 40,
            alt: 'בינוני'
        }, 'medium'],
        [{
            src: 'https://codejredu.github.io/test/assets/blocklyicon/slow.svg',
            width: 40,
            height: 40,
            alt: 'איטי'
        }, 'slow'],
        [{
            src: 'https://codejredu.github.io/test/assets/blocklyicon/fastspeed.svg',
            width: 40,
            height: 40,
            alt: 'מהיר'
        }, 'fast']
    ];
};

// --- VISUAL ENVELOPE BLOCKS ---
const ENVELOPE_ICONS = {
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2l-2.81 6.63L2 9.24l5.46 4.73L5.82 21z',
    sun: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zm-9-8v2c0 .55.45 1 1 1s1-.45-1-1V5c0-.55.45-1-1-1s-1 .45-1-1zm0 14v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1z',
    cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
    moon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
};

const ENVELOPE_CHANNEL_MAP: Record<string, {
    key: string; hex: string; colorName: string; icon: keyof typeof ENVELOPE_ICONS; iconName: string; iconFill: string; sendUri?: string; receiveUri?: string;
}> = {
    red_heart:    { key: 'red_heart',    hex: '#F44336', colorName: 'אדום', icon: 'heart', iconName: 'לב', iconFill: '#FFFFFF' },
    orange_star:  { key: 'orange_star',  hex: '#FF9800', colorName: 'כתום', icon: 'star',  iconName: 'כוכב', iconFill: '#FFFFFF' },
    yellow_sun:   { key: 'yellow_sun',   hex: '#FFC107', colorName: 'צהוב', icon: 'sun',   iconName: 'שמש', iconFill: '#424242' },
    green_cloud:  { key: 'green_cloud',  hex: '#4CAF50', colorName: 'ירוק', icon: 'cloud', iconName: 'ענן', iconFill: '#FFFFFF' },
    blue_bolt:    { key: 'blue_bolt',    hex: '#4285F4', colorName: 'כחול', icon: 'bolt',  iconName: 'ברק', iconFill: '#FFFFFF' },
    purple_moon:  { key: 'purple_moon',  hex: '#9C27B0', colorName: 'סגול', icon: 'moon',  iconName: 'ירח', iconFill: '#FFFFFF' },
};

const SEND_ENVELOPE_PATH = "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16z";
const RECEIVE_ENVELOPE_PATH = "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z";

const ENVELOPE_SVG_TEMPLATE = (envelopePath: string, envelopeColor: string, iconPath: string, iconColor: string) => `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="${envelopePath}" fill="${envelopeColor}" stroke="black" stroke-width="1"/>
        <g transform="translate(5, 6) scale(0.6)">
            <path d="${iconPath}" fill="${iconColor}"/>
        </g>
    </svg>`
)}`;

for (const channel of Object.values(ENVELOPE_CHANNEL_MAP)) {
    const iconPath = ENVELOPE_ICONS[channel.icon];
    channel.sendUri = ENVELOPE_SVG_TEMPLATE(SEND_ENVELOPE_PATH, channel.hex, iconPath, channel.iconFill);
    channel.receiveUri = ENVELOPE_SVG_TEMPLATE(RECEIVE_ENVELOPE_PATH, channel.hex, iconPath, channel.iconFill);
}
    
const envelopeChannelDropdown = function(uriType: 'sendUri' | 'receiveUri') {
    return Object.values(ENVELOPE_CHANNEL_MAP).map(channel => ([
        { 
            src: channel[uriType], 
            width: 48, 
            height: 48, 
            alt: `מעטפה ${channel.colorName} עם ${channel.iconName}` 
        },
        channel.key // The value stored by the block, e.g., 'red_heart'
    ]));
};
const envelopeChannelDropdownSend = () => envelopeChannelDropdown('sendUri');
const envelopeChannelDropdownReceive = () => envelopeChannelDropdown('receiveUri');

const SPACER_IMAGE_FIELD_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// --- BLOCK DEFINITIONS ---

export function defineBlocks() {
    Blockly.Blocks['event_send_envelope'] = {
      init: function() {
        this.jsonInit({
          'message0': '%1 %2 %3',
          'args0': [
            {
              'type': 'field_image',
              'src': 'https://codejredu.github.io/test/assets/blocklyicon/send.svg',
              'width': 48, 'height': 48, 'alt': 'שלח'
            },
            { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 20, 'height': 1, 'alt': '' },
            { 
              'type': 'field_dropdown', 
              'name': 'ENVELOPE_CHANNEL', 
              'options': envelopeChannelDropdownSend 
            }
          ],
          'previousStatement': null, 'nextStatement': null, 'style': 'events_blocks'
        });
      }
    };

    Blockly.Blocks['event_when_envelope_received'] = {
      init: function() {
        this.jsonInit({
          'message0': '%1 %2 %3',
          'args0': [
            {
              'type': 'field_image',
              'src': 'https://codejredu.github.io/test/assets/blocklyicon/receive.svg',
              'width': 48, 'height': 48, 'alt': 'קבל'
            },
            { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 20, 'height': 1, 'alt': '' },
            {
              'type': 'field_dropdown',
              'name': 'ENVELOPE_CHANNEL',
              'options': envelopeChannelDropdownReceive
            }
          ],
          'nextStatement': null, 'style': 'events_blocks'
        });
      }
    };

    Blockly.Blocks['event_when_this_sprite_clicked'] = {
      init: function() {
        this.jsonInit({
          'message0': '%1 %2',
          'args0': [
            {
              'type': 'field_image',
              'src': 'https://codejredu.github.io/test/assets/blocklyicon/whenprees.svg',
              'width': 50, 
              'height': 50,
              'alt': 'כשלוחצים על דמות זו'
            },
            { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 80, 'height': 1, 'alt': '' }
          ],
          'nextStatement': null,
          'style': 'events_blocks'
        });
      }
    };

    Blockly.Blocks['motion_movesteps'] = {
      init: function() {
        this.jsonInit({
          'message0': '%1 %2 %3 %4 %5',
          'args0': [
            { 'type': 'field_image', 'name': 'ICON', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/walk1.svg', 'width': 40, 'height': 40, 'alt': 'זוז' },
            { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
            { 'type': 'custom_field_number', 'name': 'STEPS', 'value': 10 },
            { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
            { 'type': 'field_dropdown', 'name': 'SPEED', 'options': speedDropdown }
          ],
          'previousStatement': null, 'nextStatement': null, 'style': 'motion_blocks'
        });
      }
    };

    Blockly.defineBlocksWithJsonArray([
        {
            'type': 'event_when_go_clicked',
            'message0': '%1 %2',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/flag.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'הפעל'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 90, 'height': 1, 'alt': '' }
            ],
            'nextStatement': null,
            'style': 'events_blocks'
        },
        {
            'type': 'event_when_key_pressed',
            'message0': '%1 %2 %3',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/keyboard.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'כאשר נלחץ מקש'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
                { 'type': 'field_dropdown', 'name': 'KEY_OPTION', 'options': keyPressedDropdown }
            ],
            'nextStatement': null,
            'style': 'events_blocks'
        },
        {
            'type': 'event_when_color_under',
            'message0': '%1 %2 %3 %4',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/colorpicker.svg',
                    'width': 24,
                    'height': 24,
                    'alt': 'דגום צבע'
                },
                {
                    'type': 'field_image',
                    'src': SPACER_IMAGE_FIELD_DATA_URI,
                    'width': 75,
                    'height': 1,
                    'alt': ''
                },
                {
                    'type': 'field_color_picker',
                    'name': 'COLOR',
                    'value': '#F44336'
                },
                {
                    'type': 'field_image',
                    'src': SPACER_IMAGE_FIELD_DATA_URI,
                    'width': 25,
                    'height': 1,
                    'alt': ''
                }
            ],
            'nextStatement': null,
            'style': 'events_blocks',
            'tooltip': 'מפעיל את התסריט כאשר הדמות נוגעת בצבע הנבחר על הבמה.'
        },
        {
            'type': 'event_when_bumping_sprite',
            'message0': '%1 %2 %3',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/collision.png',
                    'width': 40,
                    'height': 40,
                    'alt': 'התנגשות'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'field_dropdown', 'name': 'SPRITE_TARGET', 'options': spriteThumbnailDropdown }
            ],
            'nextStatement': null, 'style': 'events_blocks'
        },
        {
            'type': 'motion_turnright',
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/right.png', 'width': 40, 'height': 40, 'alt': 'סובב ימינה' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'DEGREES', 'value': 15 }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'motion_blocks'
        },
        {
            'type': 'motion_turnleft',
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/left.png', 'width': 40, 'height': 40, 'alt': 'סובב שמאלה' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'DEGREES', 'value': 15 }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'motion_blocks'
        },
        {
            'type': 'motion_setheading',
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/compass.svg', 'width': 40, 'height': 40, 'alt': 'קבע כיוון' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_angle', 'name': 'DEGREES', 'value': 90 }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'motion_blocks'
        },
        {
            'type': 'motion_hop',
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/jump.svg', 'width': 40, 'height': 40, 'alt': 'קפוץ' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'HEIGHT', 'value': 50 }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'motion_blocks'
        },
        { 
            'type': 'looks_sayforsecs', 
            'message0': '%1 %2 %3 %4 %5', 
            'args0': [ 
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/say.png', 'width': 40, 'height': 40, 'alt': 'אמור' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
                { 'type': 'field_input', 'name': 'MESSAGE', 'text': 'שלום!' },
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/wait.svg', 'width': 32, 'height': 32, 'alt': 'למשך' },
                { 'type': 'custom_field_number', 'name': 'SECS', 'value': 2 }
            ], 
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_say', 
            'message0': '%1 %2 %3', 
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/say.png', 'width': 40, 'height': 40, 'alt': 'אמור' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
                { 'type': 'field_input', 'name': 'MESSAGE', 'text': 'שלום!' }
            ], 
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_changesizeby', 
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/resize.svg', 'width': 40, 'height': 40, 'alt': 'הגדל' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'DELTA', 'value': 10 }
            ], 
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_shrinkby', 
            'message0': '%1 %2 %3', 
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/reduce.svg', 'width': 40, 'height': 40, 'alt': 'הקטן' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'DELTA', 'value': 10 }
            ], 
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_setsizeto', 
            'message0': '%1 %2 %3 %4', 
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/setsize100.svg', 'width': 40, 'height': 40, 'alt': 'קבע גודל ל' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 25, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'SIZE', 'value': 100 },
                { 'type': 'field_label', 'text': '%' }
            ], 
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_show', 
            'message0': '%1 %2',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/show.png', 'width': 40, 'height': 40, 'alt': 'הצג' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 90, 'height': 1, 'alt': '' }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        { 
            'type': 'looks_hide', 
            'message0': '%1 %2',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/hide.png', 'width': 40, 'height': 40, 'alt': 'הסתר' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 90, 'height': 1, 'alt': '' }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks' 
        },
        {
            'type': 'looks_switchbackdrop',
            'message0': '%1 %2 %3',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/setbg.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'קבע רקע'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 10, 'height': 1, 'alt': '' },
                { 'type': 'field_dropdown', 'name': 'BACKDROP', 'options': backdropThumbnailDropdown }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'looks_blocks'
        },
        {
            'type': 'control_wait',
            'message0': '%1 %2 %3',
            'args0': [
                { 'type': 'field_image', 'src': 'https://codejredu.github.io/test/assets/blocklyicon/wait.svg', 'width': 40, 'height': 40, 'alt': 'חכה' },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'custom_field_number', 'name': 'SECS', 'value': 1 }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'control_blocks'
        },
        {
            'type': 'control_repeat',
            'message0': '%1 %2',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/repeat.svg',
                    'width': 45,
                    'height': 45,
                    'alt': 'חזור'
                },
                { 'type': 'custom_field_number', 'name': 'TIMES', 'value': 10 }
            ],
            'message1': '%1',
            'args1': [
                { 'type': 'input_statement', 'name': 'SUBSTACK' }
            ],
            'previousStatement': null,
            'nextStatement': null,
            'style': 'control_blocks'
        },
        {
            'type': 'control_forever',
            'message0': '%1',
            'args0': [{
                'type': 'field_image',
                'src': 'https://codejredu.github.io/test/assets/blocklyicon/forever.svg',
                'width': 45,
                'height': 45,
                'alt': 'לעולמים'
            }],
            'message1': '%1',
            'args1': [
                { 'type': 'input_statement', 'name': 'SUBSTACK' }
            ],
            'previousStatement': null,
            'style': 'control_blocks',
            'tooltip': 'מריץ את הלבנים שבתוכו בלולאה אינסופית, וללא אפשרות לחבר לבנים מתחתיו.'
        },
        {
            'type': 'control_stop',
            'message0': '%1 %2',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/stop.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'עצור'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 90, 'height': 1, 'alt': '' }
            ],
            'previousStatement': null,
            'style': 'control_blocks',
            'tooltip': 'עוצר את כל התסריטים.'
        },
        {
            'type': 'sound_playuntildone',
            'message0': '%1 %2 %3',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/playuntil.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'נגן צליל עד לסיום'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'field_dropdown', 'name': 'SOUND_MENU', 'options': soundNameDropdown }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'sound_blocks'
        },
        {
            'type': 'sound_play',
            'message0': '%1 %2 %3',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/playsound.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'נגן צליל'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 40, 'height': 1, 'alt': '' },
                { 'type': 'field_dropdown', 'name': 'SOUND_MENU', 'options': soundNameDropdown }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'sound_blocks'
        },
        {
            'type': 'sound_stopallsounds', 
            'message0': '%1 %2',
            'args0': [
                {
                    'type': 'field_image',
                    'src': 'https://codejredu.github.io/test/assets/blocklyicon/stopsound.svg',
                    'width': 40,
                    'height': 40,
                    'alt': 'עצור את כל הצלילים'
                },
                { 'type': 'field_image', 'src': SPACER_IMAGE_FIELD_DATA_URI, 'width': 90, 'height': 1, 'alt': '' }
            ],
            'previousStatement': null, 'nextStatement': null, 'style': 'sound_blocks'
        }
    ]);
}