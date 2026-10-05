import { Request } from 'express';
import Metadata from '../interfaces/_metadata';
import {getDateTime} from "../helpers/date";
import GenericModel from "models/_genericModel";
import {Attachment} from "../models/attachment";
import {File} from "../models/file";
import {Block} from "../models/block";
import Exception from "../models/exception";
import {Slackuser} from "models/slackuser";
import {initSlack}  from '../providers/slack';
import {isIgnoredSlackUser} from "helpers/slackIgnore";
import {db} from '../db/knex';

const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "integer",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"client_msg_id",
        type : "string",
        sortable_key: 'path',
        show_in_list : true,
    },
    {
        key:"reply_to",
        type : "string",
        show_in_list : true,
    },
    {
        key:"user",
        type : "string",
        child_relation:{for_join: true, output_key: "slackuser", model: Slackuser, outfield:"uid",show_in_list: true},
        show_in_list : true,
    },
    {
        key:"ts",
        type : "integer",
        show_in_list : true,
    },
    {
        key:"datetime",
        type : "datetime",
        show_in_list : true,
    },
    {
        key:"workspace",
        type : "string",
        show_in_list : true,
    },
    {
        key:"channel",
        type : "string",
        show_in_list : true,
    },
    {
        key:"team",
        type : "string",
        show_in_list : false,
    },
    {
        key:"type",
        type : "string",
        show_in_list : false,
    },
    {
        key:"text",
        type : "richtext",
        show_in_list : true,
        searchable: true,
    },
    {
        key:"file_ids",
        type:"array",
        child_relation:{for_join: true, output_key: "files", model: File, show_in_list: true},
        show_in_list : true,
    },
    {
        key:"attachment_ids",
        type : "array",
        child_relation:{for_join: true, output_key: "attachments", model: Attachment, show_in_list: true},
        show_in_list : true,
    },
    {
        key:"block_ids",
        type : "array",
        child_relation:{for_join: true, output_key: "blocks", model: Block, show_in_list: true},
        show_in_list : true,
    },
];

export class Message extends GenericModel {
    indexField = 'ts';
    messageCount = 0;
    orderBy = ['ts', 'desc'];
    listAll = true;

    constructor(req: Request) {
        super('message', {metadata}, req);
    }

    async getForChannel(workspace, channelName?: string, latest?: number, oldest?: number, limit?: number, doSave = false) {
        let ret = [];
        let resp: any = {messages: [], has_more: true};
        let cursor = null;
        const slack = initSlack(workspace);

        do {
            resp = await slack.getMessagesBatch(channelName, cursor, latest, oldest, limit);
            console.log("LOADED " + resp.messages.length + " MESSAGES");
            if (!resp.messages.length) {
                break;
            }

            // const lastMessage = resp.messages[resp.messages.length-1];
            // console.log("LAST MESSAGE",lastMessage, getDateTime(lastMessage.ts));
            await this.processBatch(resp, channelName, workspace, doSave)
            ret = ret.concat(resp.messages);
            cursor = resp.response_metadata.next_cursor;
            console.log("NEXT CURSOR", cursor);
        } while (resp.has_more === true && limit === null)

        console.log("TOTAL MESSAGE COUNT", this.messageCount);
        // console.log("MESSAGES FROM SLACK API", ret);
        return ret;
    }

    async save(message, workspace, channelName, parentId?) {
        // console.log("MESSAGE", message);
        const attachment = new Attachment(this.request);
        const block = new Block(this.request);
        const file = new File(this.request);

        if (message.subtype === 'message_deleted') {
            this.responseFields = ['block_ids', 'file_ids', 'attachment_ids'];
            const messageData = await this._get({ts: message.deleted_ts}, false);

            if (!messageData) {
                throw new Exception('message_not_found');
            }
            // console.log("SAVED MESSAGE", messageData);
            if (messageData.block_ids.length) {
                await block._delete({id: messageData.block_ids}, true);
            }
            if (messageData.file_ids.length) {
                await file._delete({id: messageData.file_ids}, true);
            }
            if (messageData.attachment_ids.length) {
                await attachment._delete({id: messageData.attachment_ids}, true);
            }
            await this._delete({ts: message.deleted_ts}, true);
        }

        const payload = {
            user: message.user,
            client_msg_id: message.client_msg_id,
            datetime: getDateTime(message.ts),
            ts: message.ts,
            type: message.type,
            channel: channelName,
            team: message.team,
            text: message.text,
            attachment_ids: {},
            file_ids: {},
            block_ids: {},
            reply_to: parentId
        };

        if (message.attachments) {
            // console.log("ATTACHMENTS", message.attachments);
            await attachment.saveBatch(payload, message.attachments, workspace)
        }

        if (message.files) {
            // console.log("FILES", message.files);
            await file.saveBatch(payload, message.files, workspace)
        }

        if (message.blocks) {
            // console.log("BLOCKS", message.blocks);
            await block.saveBatch(payload, message.blocks)
        }

        console.log("SAVING MESSAGE", payload);
        return await this._addedit({...payload, workspace}, 'edit', ['id', 'ts']);
    }

    async processBatch(resp, channelName, workspace, doSave) {
        const slack = initSlack(workspace);
        for (const message of resp.messages) {

            // console.log("MESSAGE", message, getDateTime(message.ts));

            if (message.type !== 'message' && !message.client_msg_id && !message.files) {
                console.log("SKIPPING", message);
                continue;
            }
            const ignoredAuthor = isIgnoredSlackUser(workspace, message.user);
            if (!ignoredAuthor) {
                this.messageCount++;
                if (doSave) {
                    await this.save(message, workspace, channelName)
                } else {
                    console.log("MESSAGE LOADED", message);
                }
            }

            if (message.reply_count) {
                const replies = await slack.getRepliesForMessage(channelName, message.ts);
                for (let reply of replies.messages) {
                    if (reply.reply_count || !reply.client_msg_id || isIgnoredSlackUser(workspace, reply.user)) {
                        continue;
                    }
                    this.messageCount++;

                    // console.log("REPLY", reply.text, getDateTime(reply.ts));

                    if (doSave) {
                        await this.save(reply, workspace, channelName, message.ts)
                    }
                }
            }
        }
    }

    async enrichItem(item) {
        if (this.showExtendedData('replies')) {
            const replies = (await this._getCollection({reply_to: item.ts}, ['ts', 'asc'])).items;
            item.replies = replies;
        }
    }

    async attachReplies(items: Array<Record<string, any>>, filters: Record<string, any> = {}): Promise<void> {
        for (const item of items) {
            item.replies = [];
        }
        const parentTs = items.map((item) => item.ts).filter(Boolean);
        if (!parentTs.length) {
            return;
        }

        const savedLimit = this.limit;
        this.limit = null;
        try {
            const params: Record<string, any> = {reply_to: parentTs};
            if (filters.workspace) {
                params.workspace = filters.workspace;
            }
            if (filters.channel) {
                params.channel = filters.channel;
            }
            const {items: replies} = await this._getCollection(params, ['ts', 'asc']);
            const byParent = new Map<string, Array<Record<string, any>>>();
            for (const reply of replies) {
                const key = reply.reply_to;
                if (!key) {
                    continue;
                }
                const bucket = byParent.get(key);
                if (bucket) {
                    bucket.push(reply);
                } else {
                    byParent.set(key, [reply]);
                }
            }
            for (const item of items) {
                const children = byParent.get(item.ts) || [];
                children.sort((a, b) => String(a.ts).localeCompare(String(b.ts), 'en', {numeric: true}));
                item.replies = children;
            }
        } finally {
            this.limit = savedLimit;
        }
    }

    async attachParents(items: Array<Record<string, any>>, workspace?: string | string[]): Promise<void> {
        const wanted = [...new Set(items.map((item) => item.reply_to).filter(Boolean))];
        if (!wanted.length) {
            return;
        }
        let query = db(this.tableName).whereIn('ts', wanted).select('ts', 'text', 'channel', 'workspace', 'user');
        if (Array.isArray(workspace)) {
            query = query.whereIn('workspace', workspace);
        } else if (workspace) {
            query = query.andWhere('workspace', workspace);
        }
        const rows = await query;
        const byTs = new Map(rows.map((row) => [row.ts, row]));
        for (const item of items) {
            if (!item.reply_to) {
                item.parent = null;
                continue;
            }
            const parent = byTs.get(item.reply_to);
            item.parent = parent
                ? {ts: parent.ts, text: parent.text, channel: parent.channel, user: parent.user}
                : null;
        }
    }

    async getChannelsForWorkspace(workspace: string): Promise<string[]> {
        const rows = await db(this.tableName)
            .where('workspace', workspace)
            .whereNotNull('channel')
            .groupBy('channel')
            .orderBy('channel', 'asc')
            .select('channel');
        return rows.map((row) => row.channel).filter(Boolean);
    }

    async getChannelsForUser(workspace: string, uid: string): Promise<string[]> {
        const rows = await db(this.tableName)
            .where('workspace', workspace)
            .andWhere('user', uid)
            .whereNotNull('channel')
            .groupBy('channel')
            .orderBy('channel', 'asc')
            .select('channel');
        return rows.map((row) => row.channel).filter(Boolean);
    }

    async workspaceStats(workspace: string) {
        const periods = [
            {key: 'week', label: 'Past 7 days', interval: '7 days'},
            {key: 'month', label: 'Past 30 days', interval: '30 days'},
            {key: 'year', label: 'Past year', interval: '1 year'},
        ] as const;
        const result = [];
        for (const period of periods) {
            const since = () => db.raw(`now() - interval '${period.interval}'`);
            const totalRow = await db('message')
                .where('workspace', workspace)
                .where('datetime', '>=', since())
                .count('* as count')
                .first();
            const channels = await db('message')
                .where('workspace', workspace)
                .where('datetime', '>=', since())
                .whereNotNull('channel')
                .where('channel', '!=', '')
                .groupBy('channel')
                .select('channel')
                .select(db.raw('count(*)::int as count'))
                .orderBy('count', 'desc')
                .orderBy('channel', 'asc')
                .limit(10);
            const users = await db('message as message')
                .leftJoin('slackuser', function () {
                    this.on('slackuser.uid', '=', 'message.user').andOn('slackuser.workspace', '=', 'message.workspace');
                })
                .where('message.workspace', workspace)
                .where('message.datetime', '>=', since())
                .whereNotNull('message.user')
                .where('message.user', '!=', '')
                .groupBy('message.user', 'slackuser.real_name', 'slackuser.name')
                .select('message.user as uid', 'slackuser.real_name', 'slackuser.name')
                .select(db.raw('count(*)::int as count'))
                .orderBy('count', 'desc')
                .orderBy('message.user', 'asc')
                .limit(10);
            result.push({
                key: period.key,
                label: period.label,
                count: Number(totalRow?.count ?? 0),
                channels: channels.map((row) => ({channel: row.channel, count: Number(row.count)})),
                users: users.map((row) => ({
                    uid: row.uid,
                    name: row.real_name || row.name || row.uid,
                    count: Number(row.count),
                })),
            });
        }
        return {periods: result};
    }
}
