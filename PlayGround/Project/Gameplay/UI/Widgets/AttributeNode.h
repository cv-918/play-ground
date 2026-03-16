#pragma once
#include "WidgetBase.h"

class AttributeNode final : public WidgetBase
{
public:
	explicit AttributeNode(const AttributeNodeJsonInfo* _node_info, const _Point& _pos, AttributeNode* _parent);

public:
	const AttributeNodeJsonInfo* GetInfo() const { return info_; }

	const std::map<_uint, AttributeNode*>& GetChildNodes() { return child_nodes_; }
	void SetChildNodes(const std::map<_uint, AttributeNode*>& _child_nodes) { child_nodes_ = _child_nodes; }

private:
	// 노드의 데이터를 담고 있는 구조체에 대한 포인터. 필요에 따라 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	const AttributeNodeJsonInfo* info_ = nullptr;

	// 부모 노드에 대한 포인터. 필요에 따라 부모 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	AttributeNode* parent_node_ = nullptr;

	// 자식 노드 ID와 노드 객체를 매핑하는 맵. 필요에 따라 자식 노드의 상태나 레벨에 따라 다른 UI 요소를 표시할 때 활용할 수 있습니다.
	std::map<_uint, AttributeNode*> child_nodes_;

	// 이미지가 없기 때문에 텍스트로 속성 노드를 표시한다고 가정. 필요에 따라 이미지나 아이콘을 추가하여 시각적으로 표현할 수도 있습니다.
	std::wstring icon_replacing_text_;
};

/*
	[Node Icon] - 현재는 텍스트로 대체

	[Node Name]
	[Node Lv]
	[Node Description]
	[Node Effect] - 노드가 활성화되었을 때 적용되는 효과를 설명하는 텍스트. 필요에 따라 효과의 종류나 수치를 시각적으로 표현할 수도 있습니다.


	1. 노드 데이터를 읽어옴
	2. 어트리뷰트 뷰가 생성될 때 어트리뷰트 트리 생성
	3. 어트리뷰트 트리가 생성되면서 어트리뷰트 노드 생성

	트리 생성자에 노드 데이터 전체를 넘겨야 한다
	하위 노드가 몇 개 달렸고 각각 어느 방향으로 진행되는지에 대한 정보

	노드 진행 방향은 아래와 같이 명시
	812
	7 3
	654

	중앙 노드에서 네 개의 노드를 파생시킨다고 했을 때
	std::vector<AttributeNodeJsonInfo> child_node_info;
	AttributeNodeJsonInfo
	{
		// --- 기본 정보 ---
		int id_;					// 노드 고유 ID
		std::string name_;			// 유저에게 보일 이름 (예: "단단한 먼지")
		NodeType type_;				// 일반, 핵심, 특성(키스톤) 구분
		std::string desc_;			// 노드 설명
	
		// --- 3단계 시스템용 변수 ---
		NodeState state_;			// 현재 상태 (발견/해금/습득 등)
		int curr_lv_;				// 현재 레벨 (0 -> 1 -> ...)
		int last_lv_;				// 최대 마스터 레벨
	
		// --- 로직용 연결 데이터 ---
		int character_unlock_id_;	// 이 캐릭터를 얻어야 '발견'됨
		std::vector<int, int> children_nodes_info_; // 자식 노드 ID와 연결 방향 정보 (예: { {child_node_id, direction}, ... })
	
		// --- 효과 데이터 (예시) ---
		AttributeType stat_type_;	// 공격력, 방어력, 습기저항 등
		float value_per_lv_;		// 레벨당 증가 수치
	}

	기획 데이터(Static): max_lv_, stat_type_, children_nodes_info_
	유저 데이터(Dynamic/Save): state_, curr_lv_

	기획 데이터 로드 후 유저 세이브 데이터를 덮어씌우는 방식으로 구조를 나누시는 걸 추천드립니다.
*/