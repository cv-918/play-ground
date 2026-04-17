#pragma once

#include "SkillRuntimeTypes.h"

struct SkillDefinitionJsonInfo;

SkillDefinition CompileSkillDefinition(const SkillDefinitionJsonInfo& _info);
