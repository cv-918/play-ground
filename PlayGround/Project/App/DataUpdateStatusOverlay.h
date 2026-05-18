#pragma once

class DataUpdateStatusOverlay final
{
public:
	void Initialize();
	void Update(_double _delta_time);
	void Render() const;

private:
	_bool _LoadLastUpdateResult();
	void _ConfigureMessage(const std::string& _status, const std::string& _data_version);

private:
	std::wstring message_;
	_Color text_color_ = Palette::White;
	_double remaining_seconds_ = 0.0;
};
