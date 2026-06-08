let tooltips;

Hooks.on('renderChatMessage', (msg, [html]) => {
    tooltips ??= ['condition', 'effect'].map((type) =>
        game.i18n.format('DOCUMENT.TypePageFormat', {
            type: game.i18n.localize(`TYPES.Item.${type}`),
            page: 'Item',
        })
    )

    html.querySelectorAll('a.content-link, a.inline-roll').forEach((o) => {
        if (tooltips.includes(o.ariaLabel) || ('persistent' in o.dataset && o.dataset.formula)) {
            o.addEventListener('click', async (event) => {
                if (event.ctrlKey || event.metaKey) {
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const target = event.target.closest('a');
                    if (!(target instanceof HTMLAnchorElement)) return;

                    const data = {};
					
                    const actors = game.user.getActiveTokens().flatMap((t) => t.actor ?? []);
					
					if (target.classList.contains('inline-roll') && 'persistent' in target.dataset && target.dataset.formula) {
						const formula = target.dataset.formula;
						const DamageRoll = CONFIG.Dice.rolls.find((r) => r.name === 'DamageRoll');
						const roll = new DamageRoll(String(formula));
						if (roll.instances.length === 0 || roll.instances.some((i) => !i.persistent)) {
							throw Error('Unexpected error adding persistent damage: all instances must be persistent');
						}
						const baseConditionSource = game.pf2e.ConditionManager.getCondition('persistent-damage').toObject();
						const conditions = roll.instances.map((i) =>
							foundry.utils.mergeObject(foundry.utils.duplicate(baseConditionSource), {
								system: {
									persistent: { formula: i.head.expression, damageType: i.type, dc: 15 },
								},
							}),
						);
						for (const actor of actors) {
                            await actor.createEmbeddedDocuments('Item', conditions);
                        }
						
						return;
					}
										
                    if (target.classList.contains('content-link')) {                        
                        const linkname = target.innerText.trim();
                        const match = linkname.match(/[0-9]+/);
                        if (match) data.value = {value: Number(match[0])};
                        
                        const messageId = event.target.closest('li.chat-message')?.dataset.messageId;
                        const message = game.messages.get(messageId ?? '');
                        
                        const containerElement = event.target.closest('[data-cast-rank]');
                        const castRank = Number(containerElement?.dataset.castRank) || message?.flags.pf2e?.origin?.castRank || message?.flags.sf2e?.origin?.castRank || 0;
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
                                    rollOptions: message.flags.pf2e?.origin?.rollOptions ?? message.flags.sf2e?.origin?.rollOptions ?? [],
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

                    if (effect.type === 'condition') {
                        for (const actor of actors) {
                            await actor.increaseCondition(effect.slug, data.value);
                        }
                    }
                    else {
                        const effectData = effect.toObject();

                        foundry.utils.mergeObject(effectData.system, data);
                        
                        for (const actor of actors) {
                            await actor.createEmbeddedDocuments('Item', [effectData]);
                        }
                    }
                }
            });
        }
    });
  });