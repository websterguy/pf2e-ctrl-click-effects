let effectTooltips;
const MODULE_ID = "pf2e-ctrl-click-effects";

function localize(key) {
    return game.i18n.localize(`${MODULE_ID}.${key}`);
}

function format(key, data) {
    return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

function getEffectTooltips() {
    effectTooltips ??= ["condition", "effect"].map((type) =>
        game.i18n.format("DOCUMENT.TypePageFormat", {
            type: game.i18n.localize(`TYPES.Item.${type}`),
            page: "Item",
        })
    );

    return effectTooltips;
}

function isItemLink(link) {
    const uuid = link.dataset.uuid ?? "";
    return link.dataset.type === "Item" || uuid.includes(".Item.") || uuid.includes("Item.");
}

function buildApplicationData(link) {
    const data = {};

    const linkName = link.innerText.trim();
    const match = linkName.match(/[0-9]+/);
    if (match) {
        data.value = { value: Number(match[0]) };
    }

    const chatMessageElement = link.closest("li.chat-message");
    if (!chatMessageElement) {
        return data;
    }

    const messageId = chatMessageElement.dataset.messageId;
    const message = game.messages.get(messageId ?? "");
    const containerElement = link.closest("[data-cast-rank]");
    const castRank =
        Number(containerElement?.dataset.castRank) || message?.flags?.pf2e?.origin?.castRank || 0;

    if (castRank > 0) {
        data.level = { value: castRank };
    }

    if (!message?.actor) {
        return data;
    }

    const { actor, token, targetToken } = message;
    const roll = message.rolls?.at(-1);
    const originItem = message.item;
    const spellcasting =
        originItem?.isOfType("spell") && originItem.spellcasting
            ? {
                  attribute: {
                      type: originItem.attribute,
                      mod: originItem.spellcasting.statistic?.attributeModifier?.value ?? 0,
                  },
                  tradition: originItem.spellcasting.tradition,
              }
            : null;

    data.context = {
        origin: {
            actor: actor.uuid,
            token: token?.uuid ?? null,
            item: originItem?.uuid ?? null,
            spellcasting,
            rollOptions: message.flags?.pf2e?.origin?.rollOptions ?? [],
        },
        target: targetToken ? { actor: targetToken.actor.uuid, token: targetToken.token.uuid } : null,
        roll: roll
            ? {
                  total: roll.total,
                  degreeOfSuccess: message.isCheckRoll ? roll.degreeOfSuccess ?? null : null,
              }
            : null,
    };

    return data;
}

async function applyItemToActors(item, data) {
    const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
    if (actors.length === 0) {
        ui.notifications.warn(localize("notifications.noTokensSelected"));
        return;
    }

    if (item.type === "condition") {
        const slug = item.slug || item.system?.slug;
        for (const actor of actors) {
            await actor.increaseCondition(slug, data.value);
        }

        ui.notifications.info(
            format("notifications.conditionApplied", {
                count: actors.length,
                name: item.name,
            })
        );
        return;
    }

    if (item.type === "effect") {
        const effectData = item.toObject();
        mergeObject(effectData.system, data);

        for (const actor of actors) {
            await actor.createEmbeddedDocuments("Item", [effectData]);
        }

        ui.notifications.info(
            format("notifications.effectApplied", {
                count: actors.length,
                name: item.name,
            })
        );
    }
}

async function onCtrlClickContentLink(event) {
    if (!(event.ctrlKey || event.metaKey)) {
        return;
    }

    if (!(event.target instanceof Element)) {
        return;
    }

    const link = event.target.closest("a.content-link");
    if (!(link instanceof HTMLAnchorElement)) {
        return;
    }

    const uuid = link.dataset.uuid;
    if (!uuid || !isItemLink(link)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try {
        const item = await fromUuid(uuid);
        if (!item) {
            ui.notifications.error(localize("notifications.itemNotFound"));
            return;
        }

        const tooltipText = link.dataset.tooltipText;
        const isExpectedTooltip = getEffectTooltips().includes(tooltipText ?? "");
        if (!isExpectedTooltip && item.type !== "condition" && item.type !== "effect") {
            item.sheet?.render(true);
            return;
        }

        if (item.type !== "condition" && item.type !== "effect") {
            return;
        }

        const data = buildApplicationData(link);
        await applyItemToActors(item, data);
    } catch (error) {
        console.error("PF2E Ctrl Click Effects | Failed to apply effect or condition.", error);
        ui.notifications.error(localize("notifications.applyFailed"));
    }
}

function registerContentLinkListener() {
    if (globalThis._pf2eCtrlClickEffectsListener) {
        document.body.removeEventListener("click", globalThis._pf2eCtrlClickEffectsListener, {
            capture: true,
        });
    }

    globalThis._pf2eCtrlClickEffectsListener = onCtrlClickContentLink;
    document.body.addEventListener("click", globalThis._pf2eCtrlClickEffectsListener, {
        capture: true,
    });
}

Hooks.once("ready", () => {
    registerContentLinkListener();
});
