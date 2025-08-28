
declare var Blockly: any;

export function defineGenerators() {
    const jsGenerator = Blockly.JavaScript;
    jsGenerator.forBlock = jsGenerator.forBlock || {}; 
    
    // Scrub function to chain commands.
    jsGenerator.scrub_ = function (block: any, code: string, thisOnly?: boolean) {
        const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
        if (nextBlock && !thisOnly) {
            const nextCode = this.blockToCode(nextBlock);
            if (code && nextCode) {
                return `${code},\n${nextCode}`;
            }
            return code || nextCode;
        }
        return code;
    };

    // Helper for statement blocks to chain to the next block.
    const scrub = (block: any, code: string) => jsGenerator.scrub_(block, code);
    
    // --- EVENT BLOCKS ---
    // Event blocks are entry points; they just need to generate code for the blocks below them.
    jsGenerator.forBlock['event_when_go_clicked'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
    jsGenerator.forBlock['event_when_this_sprite_clicked'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
    jsGenerator.forBlock['event_when_key_pressed'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
     jsGenerator.forBlock['event_when_bumping_sprite'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
    jsGenerator.forBlock['event_when_color_under'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
    jsGenerator.forBlock['event_when_envelope_received'] = function(block: any) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? jsGenerator.blockToCode(nextBlock) : '';
    };
    jsGenerator.forBlock['event_send_envelope'] = function(block: any) { 
        return scrub(block, JSON.stringify({ 
            type: 'api.send_envelope',
            blockId: block.id,
            blockType: block.type,
            args: [block.getFieldValue('ENVELOPE_CHANNEL')] 
        })); 
    };

    // --- MOTION BLOCKS ---
    jsGenerator.forBlock['motion_movesteps'] = function(block: any) { 
        return scrub(block, JSON.stringify({ 
            type: 'api.move_steps', 
            blockId: block.id,
            blockType: block.type,
            args: [
                String(block.getFieldValue('STEPS')),
                block.getFieldValue('SPEED')
            ] 
        })); 
    };
    jsGenerator.forBlock['motion_turnright'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.turn_right', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('DEGREES'))] })); };
    jsGenerator.forBlock['motion_turnleft'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.turn_left', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('DEGREES'))] })); };
    jsGenerator.forBlock['motion_setheading'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.set_heading', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('DEGREES'))] })); };
    jsGenerator.forBlock['motion_hop'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.hop', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('HEIGHT'))] })); };

    // --- LOOKS BLOCKS ---
    jsGenerator.forBlock['looks_sayforsecs'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.say_for_secs', blockId: block.id, blockType: block.type, args: [block.getFieldValue('MESSAGE'), String(block.getFieldValue('SECS'))] })); };
    jsGenerator.forBlock['looks_say'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.say', blockId: block.id, blockType: block.type, args: [block.getFieldValue('MESSAGE')] })); };
    jsGenerator.forBlock['looks_changesizeby'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.change_size_by', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('DELTA'))] })); };
    jsGenerator.forBlock['looks_shrinkby'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.change_size_by', blockId: block.id, blockType: block.type, args: [String(-Number(block.getFieldValue('DELTA')))] })); };
    jsGenerator.forBlock['looks_setsizeto'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.set_size_to', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('SIZE'))] })); };
    jsGenerator.forBlock['looks_show'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.show', blockId: block.id, blockType: block.type, args: [] })); };
    jsGenerator.forBlock['looks_hide'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.hide', blockId: block.id, blockType: block.type, args: [] })); };
    jsGenerator.forBlock['looks_switchbackdrop'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.switch_backdrop', blockId: block.id, blockType: block.type, args: [block.getFieldValue('BACKDROP')] })); };

    // --- CONTROL BLOCKS ---
    jsGenerator.forBlock['control_wait'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.wait', blockId: block.id, blockType: block.type, args: [String(block.getFieldValue('SECS'))] })); };
    jsGenerator.forBlock['control_repeat'] = function(block: any) { 
        const times = String(block.getFieldValue('TIMES')); 
        const substackCode = jsGenerator.statementToCode(block, 'SUBSTACK'); 
        const substackCommands = substackCode ? JSON.parse(`[${substackCode}]`) : []; 
        return scrub(block, JSON.stringify({ type: 'control.repeat', blockId: block.id, blockType: block.type, args: [times], substack: substackCommands })); 
    };
    jsGenerator.forBlock['control_forever'] = function(block: any) { 
        const substackCode = jsGenerator.statementToCode(block, 'SUBSTACK'); 
        const substackCommands = substackCode ? JSON.parse(`[${substackCode}]`) : []; 
        return JSON.stringify({ type: 'control.forever', blockId: block.id, blockType: block.type, substack: substackCommands }); 
    };
    jsGenerator.forBlock['control_stop'] = function(block: any) { 
        return JSON.stringify({ type: 'api.stop_scripts', blockId: block.id, blockType: block.type, args: [] }); 
    };

    // --- SOUND BLOCKS ---
    jsGenerator.forBlock['sound_playuntildone'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.play_sound_until_done', blockId: block.id, blockType: block.type, args: [block.getFieldValue('SOUND_MENU')] })); };
    jsGenerator.forBlock['sound_play'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.play_sound', blockId: block.id, blockType: block.type, args: [block.getFieldValue('SOUND_MENU')] })); };
    jsGenerator.forBlock['sound_stopallsounds'] = function(block: any) { return scrub(block, JSON.stringify({ type: 'api.stop_all_sounds', blockId: block.id, blockType: block.type, args: [] })); };
}