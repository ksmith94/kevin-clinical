/**
 * @jest-environment jsdom
 */

import { OperationOutcome, Patient } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getDefaultFields, SearchPage, getDefaultSortRules } from './SearchPage';

async function setup(url = '/Patient', medplum = new MockClient()): Promise<void> {
  await act(async () => {
    render(
      <MedplumProvider medplum={medplum}>
        <MemoryRouter initialEntries={[url]} initialIndex={0}>
          <Routes>
            <Route path="/:resourceType/new" element={<div>Create Resource Page</div>} />
            <Route path="/:resourceType/:id" element={<div>Resource Page</div>} />
            <Route path="/:resourceType" element={<SearchPage />} />
            <Route path="/" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </MedplumProvider>
    );
  });
}

describe('SearchPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('Renders default page', async () => {
    await setup('/');
    await waitFor(() => screen.getByTestId('search-control'));

    const control = screen.getByTestId('search-control');
    expect(control).toBeDefined();
  });

  test('Renders with resourceType', async () => {
    await setup('/Patient');
    await waitFor(() => screen.getByTestId('search-control'));

    const control = screen.getByTestId('search-control');
    expect(control).toBeDefined();
  });

  test('Renders with resourceType and fields', async () => {
    await setup('/Patient?_fields=id,_lastUpdated,name,birthDate,gender');
    await waitFor(() => screen.getByTestId('search-control'));

    const control = screen.getByTestId('search-control');
    expect(control).toBeDefined();
  });

  test('Next page button exists', async () => {
    await setup();
    await waitFor(() => screen.getByTestId('next-page-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('next-page-button'));
    });
  });

  test('Prev page button exists', async () => {
    await setup();
    await waitFor(() => screen.getByTestId('prev-page-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('prev-page-button'));
    });
  });

  test('New button exists', async () => {
    await setup();
    await waitFor(() => screen.getByText('New...'));

    await act(async () => {
      fireEvent.click(screen.getByText('New...'));
    });
  });

  test('New button hidden on bot page', async () => {
    await setup('/Bot');
    await waitFor(() => screen.getByTestId('search-control'));

    expect(screen.queryByText('New...')).toBeNull();
  });

  test('Delete button, cancel', async () => {
    window.confirm = jest.fn(() => false);

    await setup();
    await waitFor(() => screen.getByText('Delete...'));

    await act(async () => {
      fireEvent.click(screen.getByText('Delete...'));
    });
  });

  test('Delete button, ok', async () => {
    const medplum = new MockClient();
    const patient = await medplum.createResource<Patient>({
      resourceType: 'Patient',
    });

    window.confirm = jest.fn(() => true);

    await setup('/Patient', medplum);
    await waitFor(() => screen.getByText(patient.id as string));
    await waitFor(() => screen.getByText('Delete...'));

    await act(async () => {
      fireEvent.click(screen.getByLabelText(`Checkbox for ${patient.id}`));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Delete...'));
    });

    try {
      await medplum.readResource('Patient', patient.id as string);
      fail('Should have thrown error');
    } catch (err) {
      expect((err as OperationOutcome).id).toEqual('not-found');
    }

    await waitFor(() => screen.queryByText(patient.id as string) === null);
  });

  test('Export button', async () => {
    window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/blob');
    window.open = jest.fn();

    await setup();
    await waitFor(() => screen.getByText('Export...'));

    await act(async () => {
      fireEvent.click(screen.getByText('Export...'));
    });
  });

  test('Default search fields', () => {
    expect(getDefaultFields('AcessPolicy')).toEqual(['id', '_lastUpdated']);
    expect(getDefaultFields('ClientApplication')).toEqual(['id', '_lastUpdated', 'name']);
    expect(getDefaultFields('Condition')).toEqual(['id', '_lastUpdated', 'subject', 'code', 'clinicalStatus']);
    expect(getDefaultFields('Device')).toEqual(['id', '_lastUpdated', 'manufacturer', 'deviceName', 'patient']);
    expect(getDefaultFields('DeviceDefinition')).toEqual(['id', '_lastUpdated', 'manufacturer[x]', 'deviceName']);
    expect(getDefaultFields('DeviceRequest')).toEqual(['id', '_lastUpdated', 'code[x]', 'subject']);
    expect(getDefaultFields('DiagnosticReport')).toEqual(['id', '_lastUpdated', 'subject', 'code', 'status']);
    expect(getDefaultFields('Encounter')).toEqual(['id', '_lastUpdated', 'subject']);
    expect(getDefaultFields('Observation')).toEqual(['id', '_lastUpdated', 'subject', 'code', 'status']);
    expect(getDefaultFields('Organization')).toEqual(['id', '_lastUpdated', 'name']);
    expect(getDefaultFields('Patient')).toEqual(['id', '_lastUpdated', 'name', 'birthDate', 'gender']);
    expect(getDefaultFields('Practitioner')).toEqual(['id', '_lastUpdated', 'name']);
    expect(getDefaultFields('Project')).toEqual(['id', '_lastUpdated', 'name']);
    expect(getDefaultFields('Questionnaire')).toEqual(['id', '_lastUpdated', 'name']);
    expect(getDefaultFields('ServiceRequest')).toEqual([
      'id',
      '_lastUpdated',
      'subject',
      'code',
      'status',
      'orderDetail',
    ]);
    expect(getDefaultFields('Subscription')).toEqual(['id', '_lastUpdated', 'criteria']);
    expect(getDefaultFields('User')).toEqual(['id', '_lastUpdated', 'email']);
    expect(getDefaultFields('ValueSet')).toEqual(['id', '_lastUpdated', 'name', 'title', 'status']);
  });

  test('Get last default search fields', () => {
    global.localStorage.setItem(
      'Patient-defaultSearch',
      JSON.stringify({
        fields: ['id', '_lastUpdated', 'name', 'birthDate', 'gender'],
      })
    );
    expect(getDefaultFields('Patient')).toEqual(['id', '_lastUpdated', 'name', 'birthDate', 'gender']);
  });

  test('Get last default sort rules', () => {
    global.localStorage.setItem(
      'Patient-defaultSearch',
      JSON.stringify({
        sortRules: {
          code: '_lastUpdated',
          descending: true,
        },
      })
    );
    expect(getDefaultSortRules('Patient')).toStrictEqual({ code: '_lastUpdated', descending: true });
  });

  test('Left click on row', async () => {
    window.open = jest.fn();

    await setup('/Patient');
    await waitFor(() => screen.getByTestId('search-control'));

    await act(async () => {
      fireEvent.click(screen.getByText('Homer Simpson'));
    });

    expect(screen.queryByText('Resource Page')).toBeDefined();
    expect(window.open).not.toHaveBeenCalled();
  });

  test('Middle click on row', async () => {
    window.open = jest.fn();
    await setup('/Patient');
    await waitFor(() => screen.getByTestId('search-control'));

    await act(async () => {
      fireEvent.click(screen.getByText('Homer Simpson'), { button: 1 });
    });

    expect(window.open).toHaveBeenCalled();

    expect(screen.queryByTestId('search-control')).toBeDefined();
  });
});
