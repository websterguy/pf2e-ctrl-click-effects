let tooltips = [];

Hooks.on("renderChatMessage", (msg, [html]) => {
    tooltips ??= ["condition", "effect"].map((type) =>
        game.i18n.format("DOCUMENT.TypePageFormat", {
            type: game.i18n.localize(`TYPES.Item.${type}`),
            page: "Item",
        })
    )

    html.querySelectorAll("a.content-link").forEach((o) => {
        if (tooltips.includes(o.dataset.tooltip)) {
            o.addEventListener('click', async (event) => {
                if (event.ctrlKey === true) {
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const target = event.target;
                    if (!(target instanceof HTMLAnchorElement)) return;

                    const data = {};
                    
                    if (target.classList.contains('content-link')) {                        
                        const linkname = target.innerText.trim();
                        const match = linkname.match(/[0-9]+/);
                        if (match) data.value = {value: Number(match[0])};
                        
                        const messageId = event.target.closest('li.chat-message')?.dataset.messageId;
                        const message = game.messages.get(messageId ?? '');
                        
                        const containerElement = event.target.closest('[data-cast-rank]');
                        const castRank = Number(containerElement?.dataset.castRank) || message?.flags.pf2e.origin?.castRank || 0;
                        if (castRank > 0) data.level = { value: castRank };
                        
                        if (message?.actor) {
                            const { actor, token, targetToken } = message;
                            const roll = message.rolls.at(-1);
                            const originItem = message.item;
                            const spellcasting =
                            originItem?.isOfType('spell') && originItem.spellcasting
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
                                    rollOptions: message.flags.pf2e.origin?.rollOptions ?? [],
                                },
                                target: targetToken ? { actor: targetToken.actor.uuid, token: targetToken.token.uuid } : null,
                                roll: roll
                                ? {
                                    total: roll.total,
                                    degreeOfSuccess: message.isCheckRoll ? roll.degreeOfSuccess ?? null : null,
                                }
                                : null,
                            };
                        }
                    }

                    const uuid = event.target.dataset.uuid;
                    const effect = await fromUuid(uuid);

                    const actors = game.user.getActiveTokens().flatMap((t) => t.actor ?? []);

                    if (effect.type === 'condition') {
                        for (const actor of actors) {
                            await actor.increaseCondition(effect.slug, data.value);
                        }
                    }
                    else {
                        const effectData = effect.toObject();

                        mergeObject(effectData.system, data);
                        
                        for (const actor of actors) {
                            await actor.createEmbeddedDocuments('Item', [effectData]);
                        }
                    }
                }
            });
        }
    });
  });