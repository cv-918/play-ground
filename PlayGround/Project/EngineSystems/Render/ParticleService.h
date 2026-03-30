#pragma once
#include "ParticleData.h"
#define _ParticleService ParticleService::Get()

/** ParticleService 클래스는 게임 내에서 파티클 시스템을 관리하는 싱글톤 서비스입니다. 이 클래스는 파티클의 생성, 업데이트, 렌더링을 담당하며, 게임 전체에서 하나의 인스턴스만 존재하도록 설계되었습니다. ParticleService는 IInitializable과 IUpdatable 인터페이스를 구현하여 초기화 및 매 프레임 업데이트 로직을 포함합니다. */
class ParticleService final
	: public ISingleton<ParticleService>
	, public IInitializable
	, public IUpdatable
{
public:
	_bool Initialize(_uint _pool_size);
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	/**
	* 이 함수는 파티클 시스템에서 새로운 파티클을 생성할 때 호출됩니다. 예를 들어, 폭발 효과, 마법 효과, 기타 시각적 효과를 구현할 때 이 함수를 사용하여 필요한 파티클을 생성할 수 있습니다.
	* 파티클의 초기 위치, 속도, 수명, 크기를 매개변수로 받아서 새로운 파티클을 설정하고 활성화합니다.
	* 만약 파티클 풀에 비활성화된 파티클이 있다면 해당 파티클을 재사용하여 새로운 파티클로 설정하고 활성화합니다. 그렇지 않으면 새로운 파티클을 풀에 추가합니다.
	*/
	void Emit(const _Vector2& _pos, const _Vector2& _vel, _float _life, _float _scale = 1.0f);

	/** 고도화된 Emit: 세팅 정보를 받아 파티클을 생성합니다. */
	void Emit(const ParticleSetting& _setting, const _Vector2& _pos);

private:
	/**
	* 파티클 풀은 게임에서 사용되는 모든 파티클을 저장하는 컨테이너입니다.
	* 이 풀은 활성화된 파티클과 비활성화된 파티클을 모두 포함하며, 새로운 파티클이 필요할 때 비활성화된 파티클을 재사용하여 성능을 최적화합니다.
	*/
	std::vector<Particle> particle_pool_;

	/** 현재 활성화된 파티클의 인덱스들만 보관, Update와 Render는 이 리스트만 순회합니다. */
	std::list<_uint> active_indices_;

	/** 사용 가능한(비활성) 인덱스들을 보관 (스택처럼 사용) */
	std::vector<_uint> free_indices_;

	/** 현재 파티클 풀에서 활성화된 파티클의 수를 나타냅니다. 이 값은 업데이트 및 렌더링 시 활성화된 파티클만 처리하기 위해 사용됩니다. */
	_uint pool_size_ = 0;
};

