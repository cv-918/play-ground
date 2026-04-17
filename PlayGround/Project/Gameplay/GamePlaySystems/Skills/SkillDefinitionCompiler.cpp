#include "framework.h"
#include "SkillDefinitionCompiler.h"

#include "GamePlaySystems/Json/SkillDefinitionDataManager.h"

SkillDefinition CompileSkillDefinition(const SkillDefinitionJsonInfo& _info)
{
	SkillDefinition definition;
	definition.skill_id_ = _info.id_;
	definition.display_name_ = _info.display_name_;
	definition.description_ = _info.description_;
	definition.icon_path_ = _info.icon_path_;
	definition.cooldown_sec_ = _info.cooldown_sec_;
	definition.binding_keys_ = _info.binding_keys_;
	definition.node_table_ = _info.node_table_;

	for (const auto& entry_point : _info.graph_entry_points_)
	{
		definition.graph_entry_points_[entry_point.event_] = entry_point.node_id_;
	}

	return definition;
}
