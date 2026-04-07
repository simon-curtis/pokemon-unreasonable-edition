import type { NodeSchema } from './types'

/* ── Flow ── */

const label: NodeSchema = {
  type: 'label',
  label: 'Script Label',
  category: 'flow',
  color: '#ef4444',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { labelName: '' },
  fields: [{ key: 'labelName', label: 'Label', type: 'text', placeholder: 'MapName_EventScript_Name' }],
}

const end: NodeSchema = {
  type: 'end',
  label: 'End',
  category: 'flow',
  color: '#ef4444',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [],
  defaults: {},
  fields: [],
}

const returnNode: NodeSchema = {
  type: 'return',
  label: 'Return',
  category: 'flow',
  color: '#ef4444',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [],
  defaults: {},
  fields: [],
}

const call: NodeSchema = {
  type: 'call',
  label: 'Call',
  category: 'flow',
  color: '#ef4444',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { target: '' },
  fields: [{ key: 'target', label: 'Target Label', type: 'text', placeholder: 'EventScript_Name' }],
}

/* ── Message ── */

const msgbox: NodeSchema = {
  type: 'msgbox',
  label: 'Message',
  category: 'message',
  color: '#3b82f6',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { text: '', msgType: 'MSGBOX_DEFAULT' },
  fields: [
    { key: 'text', label: 'Text', type: 'textarea', placeholder: 'Dialog text...' },
    {
      key: 'msgType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'MSGBOX_DEFAULT', label: 'Default' },
        { value: 'MSGBOX_NPC', label: 'NPC (auto lock/face/release)' },
        { value: 'MSGBOX_YESNO', label: 'Yes / No' },
        { value: 'MSGBOX_SIGN', label: 'Sign (no lock)' },
      ],
    },
  ],
}

/* ── Branch ── */

const branchFlag: NodeSchema = {
  type: 'branch_flag',
  label: 'Check Flag',
  category: 'branch',
  color: '#22c55e',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [
    { id: 'flow_true', label: 'SET', type: 'flow' },
    { id: 'flow_false', label: 'UNSET', type: 'flow' },
  ],
  defaults: { flag: '' },
  fields: [{ key: 'flag', label: 'Flag', type: 'flag', placeholder: 'FLAG_...' }],
}

const branchVar: NodeSchema = {
  type: 'branch_var',
  label: 'Compare Var',
  category: 'branch',
  color: '#22c55e',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [
    { id: 'flow_true', label: 'TRUE', type: 'flow' },
    { id: 'flow_false', label: 'FALSE', type: 'flow' },
  ],
  defaults: { var: '', op: 'VAR_RESULT', comparison: '==', value: '0' },
  fields: [
    { key: 'var', label: 'Variable', type: 'var', placeholder: 'VAR_RESULT' },
    {
      key: 'comparison',
      label: 'Comparison',
      type: 'select',
      options: [
        { value: '==', label: '==' },
        { value: '!=', label: '!=' },
        { value: '>', label: '>' },
        { value: '<', label: '<' },
        { value: '>=', label: '>=' },
        { value: '<=', label: '<=' },
      ],
    },
    { key: 'value', label: 'Value', type: 'text', placeholder: '0' },
  ],
}

const branchYesNo: NodeSchema = {
  type: 'branch_yesno',
  label: 'Yes / No Result',
  category: 'branch',
  color: '#22c55e',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [
    { id: 'flow_yes', label: 'YES', type: 'flow' },
    { id: 'flow_no', label: 'NO', type: 'flow' },
  ],
  defaults: {},
  fields: [],
}

/* ── State ── */

const setFlag: NodeSchema = {
  type: 'set_flag',
  label: 'Set Flag',
  category: 'state',
  color: '#a855f7',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { flag: '', action: 'set' },
  fields: [
    { key: 'flag', label: 'Flag', type: 'flag', placeholder: 'FLAG_...' },
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      options: [
        { value: 'set', label: 'Set (TRUE)' },
        { value: 'clear', label: 'Clear (FALSE)' },
      ],
    },
  ],
}

const setVar: NodeSchema = {
  type: 'set_var',
  label: 'Set Variable',
  category: 'state',
  color: '#a855f7',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { var: '', value: '0' },
  fields: [
    { key: 'var', label: 'Variable', type: 'var', placeholder: 'VAR_...' },
    { key: 'value', label: 'Value', type: 'text', placeholder: '0' },
  ],
}

/* ── Items & Pokemon ── */

const giveItem: NodeSchema = {
  type: 'give_item',
  label: 'Give Item',
  category: 'items',
  color: '#f59e0b',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { item: '', quantity: '1' },
  fields: [
    { key: 'item', label: 'Item', type: 'item', placeholder: 'ITEM_...' },
    { key: 'quantity', label: 'Qty', type: 'number' },
  ],
}

const giveMon: NodeSchema = {
  type: 'give_mon',
  label: 'Give Pokemon',
  category: 'pokemon',
  color: '#f59e0b',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [
    { id: 'flow_party', label: 'TO PARTY', type: 'flow' },
    { id: 'flow_pc', label: 'TO PC', type: 'flow' },
    { id: 'flow_full', label: 'NO ROOM', type: 'flow' },
  ],
  defaults: { species: '', level: '5', item: '' },
  fields: [
    { key: 'species', label: 'Species', type: 'species', placeholder: 'SPECIES_...' },
    { key: 'level', label: 'Level', type: 'number' },
    { key: 'item', label: 'Held Item', type: 'item', placeholder: '(none)' },
  ],
}

/* ── Movement ── */

const lockRelease: NodeSchema = {
  type: 'lock_release',
  label: 'Lock / Release',
  category: 'movement',
  color: '#06b6d4',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { action: 'lock', scope: 'all' },
  fields: [
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      options: [
        { value: 'lock', label: 'Lock' },
        { value: 'release', label: 'Release' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      options: [
        { value: 'single', label: 'Single (player interaction)' },
        { value: 'all', label: 'All objects' },
      ],
    },
  ],
}

const faceplayer: NodeSchema = {
  type: 'faceplayer',
  label: 'Face Player',
  category: 'movement',
  color: '#06b6d4',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: {},
  fields: [],
}

const applyMovement: NodeSchema = {
  type: 'apply_movement',
  label: 'Apply Movement',
  category: 'movement',
  color: '#06b6d4',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { objectId: 'OBJ_EVENT_ID_PLAYER', movementLabel: '', waitAfter: true },
  fields: [
    { key: 'objectId', label: 'Object', type: 'text', placeholder: 'OBJ_EVENT_ID_PLAYER' },
    { key: 'movementLabel', label: 'Movement Label', type: 'text', placeholder: 'Movement_WalkLeft' },
  ],
}

/* ── Battle ── */

const trainerBattle: NodeSchema = {
  type: 'trainer_battle',
  label: 'Trainer Battle',
  category: 'battle',
  color: '#dc2626',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: 'AFTER', type: 'flow' }],
  defaults: { battleType: 'single', trainer: '', introText: '', loseText: '' },
  fields: [
    {
      key: 'battleType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'single', label: 'Single' },
        { value: 'double', label: 'Double' },
      ],
    },
    { key: 'trainer', label: 'Trainer', type: 'trainer', placeholder: 'TRAINER_...' },
    { key: 'introText', label: 'Intro Text', type: 'textarea', placeholder: 'Before battle...' },
    { key: 'loseText', label: 'Lose Text', type: 'textarea', placeholder: 'After losing...' },
  ],
}

const wildBattle: NodeSchema = {
  type: 'wild_battle',
  label: 'Wild Battle',
  category: 'battle',
  color: '#dc2626',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: 'AFTER', type: 'flow' }],
  defaults: { species: '', level: 30, item: '' },
  fields: [
    { key: 'species', label: 'Species', type: 'species', placeholder: 'SPECIES_...' },
    { key: 'level', label: 'Level', type: 'number' },
    { key: 'item', label: 'Held Item', type: 'item', placeholder: 'ITEM_NONE (optional)' },
  ],
}

/* ── Audio ── */

const playSound: NodeSchema = {
  type: 'play_sound',
  label: 'Play Sound',
  category: 'audio',
  color: '#ec4899',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { soundType: 'se', soundId: '' },
  fields: [
    {
      key: 'soundType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'se', label: 'Sound Effect' },
        { value: 'fanfare', label: 'Fanfare' },
        { value: 'bgm', label: 'Background Music' },
      ],
    },
    { key: 'soundId', label: 'Sound ID', type: 'sound', placeholder: 'SE_...' },
  ],
}

/* ── Warp ── */

const warp: NodeSchema = {
  type: 'warp',
  label: 'Warp',
  category: 'warp',
  color: '#8b5cf6',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [],
  defaults: { warpType: 'warp', map: '', x: '0', y: '0' },
  fields: [
    {
      key: 'warpType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'warp', label: 'Warp (with sound)' },
        { value: 'warpsilent', label: 'Silent' },
        { value: 'warpdoor', label: 'Door' },
        { value: 'warphole', label: 'Hole' },
      ],
    },
    { key: 'map', label: 'Map', type: 'map', placeholder: 'MAP_...' },
    { key: 'x', label: 'X', type: 'number' },
    { key: 'y', label: 'Y', type: 'number' },
  ],
}

/* ── Misc ── */

const delay: NodeSchema = {
  type: 'delay',
  label: 'Delay',
  category: 'misc',
  color: '#6b7280',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { frames: '30' },
  fields: [{ key: 'frames', label: 'Frames', type: 'number' }],
}

const special: NodeSchema = {
  type: 'special',
  label: 'Special',
  category: 'misc',
  color: '#6b7280',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { func: '' },
  fields: [{ key: 'func', label: 'Function', type: 'text', placeholder: 'HealPlayerParty' }],
}

const rawMacro: NodeSchema = {
  type: 'raw_macro',
  label: 'Raw Assembly',
  category: 'misc',
  color: '#6b7280',
  inputs: [{ id: 'flow_in', label: '', type: 'flow' }],
  outputs: [{ id: 'flow_out', label: '', type: 'flow' }],
  defaults: { code: '' },
  fields: [{ key: 'code', label: 'Assembly', type: 'textarea', placeholder: '    waitstate' }],
}

/* ── Registry ── */

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  label,
  end,
  return: returnNode,
  call,
  msgbox,
  branch_flag: branchFlag,
  branch_var: branchVar,
  branch_yesno: branchYesNo,
  set_flag: setFlag,
  set_var: setVar,
  give_item: giveItem,
  give_mon: giveMon,
  lock_release: lockRelease,
  faceplayer,
  apply_movement: applyMovement,
  trainer_battle: trainerBattle,
  wild_battle: wildBattle,
  play_sound: playSound,
  warp,
  delay,
  special,
  raw_macro: rawMacro,
}

export const CATEGORIES: { key: string; label: string }[] = [
  { key: 'flow', label: 'Flow Control' },
  { key: 'message', label: 'Messages' },
  { key: 'branch', label: 'Branching' },
  { key: 'state', label: 'State' },
  { key: 'items', label: 'Items' },
  { key: 'pokemon', label: 'Pokemon' },
  { key: 'movement', label: 'Movement' },
  { key: 'battle', label: 'Battle' },
  { key: 'audio', label: 'Audio' },
  { key: 'warp', label: 'Warp' },
  { key: 'misc', label: 'Misc' },
]

export function getSchema(type: string): NodeSchema {
  const s = NODE_SCHEMAS[type]
  if (!s) throw new Error(`Unknown node type: ${type}`)
  return s
}
