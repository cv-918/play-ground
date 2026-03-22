#pragma once

#define _CommonGamePlayFunc CommonGamePlayFunctions
namespace CommonGamePlayFunctions
{
	inline std::wstring GetLayerName(CollisionLayer _layer)
	{
		switch (_layer)
		{
		case CollisionLayer::PlayerBody:
			return L"PlayerBody";
		case CollisionLayer::PlayerAttack:
			return L"PlayerAttack";
		case CollisionLayer::EnemyBody:
			return L"EnemyBody";
		case CollisionLayer::EnemyAttack:
			return L"EnemyAttack";
		case CollisionLayer::EnemyBullet:
			return L"EnemyBullet";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetSceneTypeName(SceneType _scene_type)
	{
		switch (_scene_type)
		{
		case SceneType::Intro:
			return L"Intro";
		case SceneType::Loading:
			return L"Loading";
		case SceneType::OutGame:
			return L"OutGame";
		case SceneType::InGame:
			return L"InGame";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetComponentTypeName(ComponentType _component_type)
	{
		switch (_component_type)
		{
		case ComponentType::Undefined:
			return L"Undefined";
		case ComponentType::Transform:
			return L"Transform";
		case ComponentType::Status:
			return L"Status";
		case ComponentType::Movement:
			return L"Movement";
		case ComponentType::SphereCollider:
			return L"SphereCollider";
		case ComponentType::RectCollider:
			return L"RectCollider";
		case ComponentType::Combat:
			return L"Combat";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetMovementPatternName(MovementPattern _movement_pattern)
	{
		switch (_movement_pattern)
		{
		case MovementPattern::Playable:
			return L"Playable";
		case MovementPattern::Stopped:
			return L"Stopped";
		case MovementPattern::Directional:
			return L"Directional";
		case MovementPattern::Target:
			return L"Target";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetEnemyCategoryName(EnemyCategory _enemy_category)
	{
		switch (_enemy_category)
		{
		case EnemyCategory::WasExpDust:
			return L"WasExpDust";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetEnemyTierName(EnemyTier _enemy_tier)
	{
		switch (_enemy_tier)
		{
		case EnemyTier::Normal:
			return L"Normal";
		case EnemyTier::Elite:
			return L"Elite";
		case EnemyTier::Danger:
			return L"Danger";
		case EnemyTier::Special:
			return L"Special";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetEnemySpecialRoleName(EnemySpecialRole _enemy_special_role)
	{
		switch (_enemy_special_role)
		{
		case EnemySpecialRole::Tank:
			return L"Tank";
		case EnemySpecialRole::Rich:
			return L"Rich";
		case EnemySpecialRole::Shooter:
			return L"Shooter";
		case EnemySpecialRole::Splitter:
			return L"Splitter";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetEnemyProjectilePatternName(EnemyProjectilePattern _enemy_projectile_pattern)
	{
		switch (_enemy_projectile_pattern)
		{
		case EnemyProjectilePattern::Direct:
			return L"Direct";
		case EnemyProjectilePattern::Aimed:
			return L"Aimed";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetPlayableCharacterIdName(PlayableCharacterId _playable_character_id)
	{
		switch (_playable_character_id)
		{
		case PlayableCharacterId::Dusty:
			return L"Dusty";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetNodeGradeName(NodeGrade _node_grade)
	{
		switch (_node_grade)
		{
		case NodeGrade::Common:
			return L"Common";
		case NodeGrade::Major:
			return L"Major";
		case NodeGrade::Keystone:
			return L"Keystone";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetNodeTierName(NodeTier _node_tier)
	{
		switch (_node_tier)
		{
		case NodeTier::Tier1:
			return L"Tier1";
		case NodeTier::Tier2:
			return L"Tier2";
		case NodeTier::Tier3:
			return L"Tier3";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetNodeStateName(NodeState _node_state)
	{
		switch (_node_state)
		{
		case NodeState::Hidden:
			return L"Hidden";
		case NodeState::Locked:
			return L"Locked";
		case NodeState::Unlocked:
			return L"Unlocked";
		case NodeState::Acquired:
			return L"Acquired";
		case NodeState::Mastered:
			return L"Mastered";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetAttributeTypeName(AttributeType _attribute_type)
	{
		switch (_attribute_type)
		{
		case AttributeType::Attack:
			return L"Attack";
		case AttributeType::Hp:
			return L"Hp";
		case AttributeType::MoveSpeed:
			return L"MoveSpeed";
		case AttributeType::AttackRange:
			return L"AttackRange";
		case AttributeType::CollectionRange:
			return L"CollectionRange";
		case AttributeType::Runtime:
			return L"Runtime";
		case AttributeType::SpecialAbility:
			return L"SpecialAbility";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetSpecialAbilityIdName(SpecialAbilityId _special_ability_id)
	{
		switch (_special_ability_id)
		{
		case SpecialAbilityId::DustCollect:
			return L"DustCollect";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetAttributeCalculationTypeName(AttributeCalculationType _calc_type)
	{
		switch (_calc_type)
		{
		case AttributeCalculationType::Additive:
			return L"Additive";
		case AttributeCalculationType::Multiplicative:
			return L"Multiplicative";
		default:
			return L"Undefined";
		}
	}

	inline std::wstring GetNodeDirectionName(NodeDirection _node_direction)
	{
		switch (_node_direction)
		{
		case NodeDirection::Up:
			return L"Up";
		case NodeDirection::RightUp:
			return L"RightUp";
		case NodeDirection::Right:
			return L"Right";
		case NodeDirection::RightDown:
			return L"RightDown";
		case NodeDirection::Down:
			return L"Down";
		case NodeDirection::LeftDown:
			return L"LeftDown";
		case NodeDirection::Left:
			return L"Left";
		case NodeDirection::LeftUp:
			return L"LeftUp";
		default:
			return L"Undefined";
		}
	}
}