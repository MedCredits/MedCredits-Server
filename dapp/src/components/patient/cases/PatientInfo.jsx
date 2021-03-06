import React, { PureComponent } from 'react'
import { HippoToggleButtonGroup } from '~/components/forms/HippoToggleButtonGroup'
import { HippoTextInput } from '~/components/forms/HippoTextInput'
import classnames from 'classnames'
import Select from 'react-select'
import * as Animated from 'react-select/lib/animated';
import { customStyles } from '~/config/react-select-custom-styles'
import { countries } from '~/lib/countries'

export const PatientInfo = class _PatientInfo extends PureComponent {

  render() {
    const {
      errors,
      textInputOnBlur,
      textInputOnChange,
      buttonGroupOnChange,
      gender,
      allergies,
      country,
      region
    } = this.props

    return (
      <span>
        <div className="form-group--heading">
          Your Info:
        </div>

        <div className="row">
          <div className="col-xs-4 col-sm-3 col-md-3">
            <HippoTextInput
              min="0"
              type="number"
              id="age"
              name="age"
              label="Age"
              error={errors['age']}
              textInputOnBlur={textInputOnBlur}
              textInputOnChange={textInputOnChange}
            />
          </div>
        </div>

        <HippoToggleButtonGroup
          id='gender'
          name="gender"
          colClasses='col-xs-12 col-md-12'
          label='Gender'
          error={errors['gender']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Male', 'Female']}
        />

        <HippoToggleButtonGroup
          id='pregnant'
          name="pregnant"
          colClasses='col-xs-12 col-md-12'
          label='Pregnant?'
          error={errors['pregnant']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Yes', 'No', 'Unsure']}
          visible={gender === 'Female' ? true : false}
        />

        <div className="row">
          <div className="col-xs-12 col-sm-6 col-md-6">
            <div className={classnames('form-group', { 'has-error': errors['country'] })}>
              <label className="control-label">Country</label>
              <Select
                placeholder='Please select your Country'
                styles={customStyles}
                components={Animated}
                closeMenuOnSelect={true}
                ref={this.props.setCountryRef}
                options={countries}
                onChange={this.props.handleCountryChange}
                selected={country}
                required
              />
              {errors['country']}
            </div>
          </div>
          <div className="col-xs-9 col-sm-6 col-md-6">
            <div className={classnames('form-group', { 'has-error': errors['region'] })}>
              <label className="control-label">State</label>
              <Select
                isDisabled={!this.props.isCanadaOrUSA()}
                placeholder='Please select your State'
                styles={customStyles}
                components={Animated}
                closeMenuOnSelect={true}
                ref={this.props.setRegionRef}
                options={this.props.regionOptions}
                onChange={this.props.handleRegionChange}
                value={region}
              />
              {errors['region']}
            </div>
          </div>
        </div>

        <HippoToggleButtonGroup
          id='allergies'
          name="allergies"
          colClasses='col-xs-12 col-md-12'
          label='Allergies?'
          error={errors['allergies']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Yes', 'No']}
        />

        <HippoTextInput
          id='whatAllergies'
          name="whatAllergies"
          colClasses='col-xs-12 col-sm-12 col-md-12'
          label='What are they?'
          error={errors['whatAllergies']}
          textInputOnBlur={textInputOnBlur}
          textInputOnChange={textInputOnChange}
          visible={allergies === 'Yes' ? true : false}
        />

        <div className="form-group--heading">
          Your Condition:
        </div>

        <HippoToggleButtonGroup
          id='spotRashOrAcne'
          name="spotRashOrAcne"
          colClasses='col-xs-12 col-md-12'
          label='Is the problem a concerning spot, rash or acne?'
          error={errors['spotRashOrAcne']}
          buttonGroupOnChange={buttonGroupOnChange}
          values={['Spot', 'Rash', 'Acne']}
        />
      </span>
    )
  }

}
